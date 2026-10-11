import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, desc, eq, gte, lt } from 'drizzle-orm';

import {
  ads,
  db,
  planSubscriptions,
  tasks,
  taskCompletions,
  users,
} from '../database';

import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { MAILER, type Mailer } from '../mail/mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Nigeria (WAT) is UTC+1 all year — no daylight saving — so the task day
// can be pinned to Lagos midnight regardless of the server's own timezone.
const WAT_OFFSET_MS = 60 * 60 * 1000;

// How many tasks a user is shown per day, drawn at random from every
// active task. Never fewer than the user's plan limit, so a plan that
// allows more than this can still fill its allowance.
const TASKS_SHOWN_PER_DAY = 10;

// Max reviewed (approved/rejected) completions returned to the admin
// review page. The pending queue is always returned in full.
const COMPLETIONS_HISTORY_LIMIT = 500;

/** Start of the current task day (00:00 Lagos time) as a UTC instant. */
function startOfTaskDay(now = new Date()) {
  const shifted = new Date(now.getTime() + WAT_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - WAT_OFFSET_MS);
}

/**
 * Deterministic 32-bit hash (FNV-1a). Used to shuffle tasks per user per
 * day, so the random selection stays stable across refreshes and only
 * changes when the day rolls over.
 */
function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
    @Optional() @Inject(MAILER) private readonly mailer?: Mailer,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Admin: create a task.
   */
  async createTask(adminId: string, dto: CreateTaskDto) {
    const [task] = await db
      .insert(tasks)
      .values({
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        durationSeconds: dto.durationSeconds,
        taskType: dto.taskType ?? 'other',
        targetUrl: dto.targetUrl,
        status: 'active',
      })
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'create',
      entityType: 'task',
      entityId: task.id,
      description: `Created task "${task.title}"`,
      newValues: { ...dto },
    });

    return task;
  }

  /**
   * Get today's tasks for a user. Excludes ad-generated tasks the user
   * themselves funded — you can't complete (and get paid for) your own
   * ad campaign — and any task they already submitted on a previous day
   * (a task can only ever be done once).
   *
   * From what's left the user sees a random selection of
   * TASKS_SHOWN_PER_DAY (or their plan limit, if higher). The shuffle is
   * seeded by user + day, so the list is stable across refreshes and a
   * new set appears after midnight. Tasks submitted *today* always stay
   * in the list so the user can still see their pending/approved/rejected
   * status.
   */
  async getTasks(userId: string) {
    const startOfDay = startOfTaskDay();

    const [rows, pastCompletions, todayCompletions, subscription] =
      await Promise.all([
        db
          .select({ task: tasks, ad: ads })
          .from(tasks)
          .leftJoin(ads, eq(tasks.adId, ads.id))
          .where(eq(tasks.status, 'active'))
          .orderBy(desc(tasks.createdAt)),
        db
          .select({ taskId: taskCompletions.taskId })
          .from(taskCompletions)
          .where(
            and(
              eq(taskCompletions.userId, userId),
              lt(taskCompletions.completedAt, startOfDay),
            ),
          ),
        db
          .select({ taskId: taskCompletions.taskId })
          .from(taskCompletions)
          .where(
            and(
              eq(taskCompletions.userId, userId),
              gte(taskCompletions.completedAt, startOfDay),
            ),
          ),
        db.query.planSubscriptions.findFirst({
          where: and(
            eq(planSubscriptions.userId, userId),
            eq(planSubscriptions.status, 'active'),
          ),
        }),
      ]);

    const doneBeforeToday = new Set(pastCompletions.map((c) => c.taskId));
    const doneToday = new Set(todayCompletions.map((c) => c.taskId));
    const shownCount = Math.max(
      TASKS_SHOWN_PER_DAY,
      subscription?.dailyTaskLimit ?? 0,
    );
    const seed = `${userId}:${startOfDay.toISOString()}`;

    const available = rows
      .filter((r) => !r.ad || r.ad.userId !== userId)
      .filter((r) => !doneBeforeToday.has(r.task.id));

    const submittedToday = available.filter((r) => doneToday.has(r.task.id));
    const shuffled = available
      .filter((r) => !doneToday.has(r.task.id))
      .map((r) => ({ r, key: hashString(`${seed}:${r.task.id}`) }))
      .sort((a, b) => a.key - b.key)
      .map(({ r }) => r);

    return [...submittedToday, ...shuffled]
      .slice(0, Math.max(shownCount, submittedToday.length))
      .map((r) => ({
        ...r.task,
        source: r.task.adId ? ('ad' as const) : ('admin' as const),
      }));
  }

  /**
   * Today's task allowance for the user: how many they've submitted
   * today (pending, approved and rejected all count — a submission uses
   * up a slot the moment it's made) against their plan's daily limit,
   * plus when the allowance resets (next midnight, Lagos time). Uses the
   * same day boundary as completeTask(), so the frontend countdown lands
   * exactly when the server starts accepting submissions again.
   */
  async getDailyStatus(userId: string) {
    const startOfDay = startOfTaskDay();

    const resetsAt = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const subscription = await db.query.planSubscriptions.findFirst({
      where: and(
        eq(planSubscriptions.userId, userId),
        eq(planSubscriptions.status, 'active'),
      ),
    });

    const todayCompletions = await db
      .select({ id: taskCompletions.id })
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, startOfDay),
        ),
      );

    const dailyTaskLimit = subscription?.dailyTaskLimit ?? 0;
    const completedToday = todayCompletions.length;

    return {
      completedToday,
      dailyTaskLimit,
      limitReached: !!subscription && completedToday >= dailyTaskLimit,
      resetsAt: resetsAt.toISOString(),
    };
  }

  /**
   * Admin: get every task, active and inactive.
   */
  async getAllTasks() {
    return db.query.tasks.findMany({
      orderBy: [desc(tasks.createdAt)],
    });
  }

  /**
   * Get a task by ID.
   */
  async getTask(taskId: string) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Admin: update a task.
   */
  async updateTask(adminId: string, taskId: string, dto: UpdateTaskDto) {
    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const [updated] = await db
      .update(tasks)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.reward !== undefined && { reward: dto.reward }),
        ...(dto.durationSeconds !== undefined && {
          durationSeconds: dto.durationSeconds,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.taskType !== undefined && { taskType: dto.taskType }),
        ...(dto.targetUrl !== undefined && { targetUrl: dto.targetUrl }),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'task',
      entityId: taskId,
      description: `Updated task "${existing.title}"`,
      oldValues: { ...existing },
      newValues: { ...dto },
    });

    return updated;
  }

  /**
   * Admin: permanently delete a task. Refuses if any completions exist
   * for it (approved, rejected, or pending) — `task_completions.task_id`
   * is `onDelete: restrict`, and those rows are reward/audit history
   * that must never be silently destroyed. Deactivate the task instead
   * (`updateTask` with `status: 'inactive'`) if it has history.
   */
  async deleteTask(adminId: string, taskId: string) {
    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const hasCompletions = await db.query.taskCompletions.findFirst({
      where: eq(taskCompletions.taskId, taskId),
    });

    if (hasCompletions) {
      throw new BadRequestException(
        'This task has completion history and cannot be deleted — set it to inactive instead',
      );
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    await this.auditService.log({
      actorId: adminId,
      action: 'delete',
      entityType: 'task',
      entityId: taskId,
      description: `Deleted task "${existing.title}"`,
      oldValues: { ...existing },
    });

    return { message: 'Task deleted.' };
  }

  /**
   * Admin: delete several tasks at once. Best-effort, not all-or-
   * nothing — each id is attempted independently through the same
   * completion-history guard as a single delete, so one task with
   * history doesn't block the rest of the selection from being
   * removed. Returns which ids succeeded and which were skipped (with
   * why), so the admin UI can report a clear outcome for a mixed
   * selection.
   */
  async bulkDeleteTasks(adminId: string, taskIds: string[]) {
    const deleted: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const taskId of taskIds) {
      try {
        await this.deleteTask(adminId, taskId);
        deleted.push(taskId);
      } catch (err) {
        skipped.push({
          id: taskId,
          reason:
            err instanceof BadRequestException ||
            err instanceof NotFoundException
              ? err.message
              : 'Could not delete this task',
        });
      }
    }

    return { deleted, skipped };
  }

  /**
   * Admin: recycle a task — copy it into a brand-new active task with a
   * clean slate, so every user (including those who already did the
   * original) can complete it again. The original row and its
   * completion history are left untouched, apart from being set to
   * inactive so users don't see two copies of the same task. Ad-generated
   * tasks belong to a paid campaign and can't be recycled.
   */
  async recycleTask(adminId: string, taskId: string) {
    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    if (existing.adId) {
      throw new BadRequestException(
        'Ad campaign tasks cannot be recycled',
      );
    }

    const recycled = await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(tasks)
        .values({
          title: existing.title,
          description: existing.description,
          reward: existing.reward,
          durationSeconds: existing.durationSeconds,
          taskType: existing.taskType,
          targetUrl: existing.targetUrl,
          status: 'active',
        })
        .returning();

      await tx
        .update(tasks)
        .set({ status: 'inactive', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      await this.auditService.log({
        actorId: adminId,
        action: 'create',
        entityType: 'task',
        entityId: task.id,
        description: `Recycled task "${existing.title}"`,
        oldValues: { recycledFromTaskId: taskId },
        newValues: { ...task },
        tx,
      });

      return task;
    });

    return recycled;
  }

  /**
   * Admin: recycle several tasks at once. Best-effort like
   * bulkDeleteTasks — each id goes through recycleTask independently and
   * the result reports which were recycled (with the new task id) and
   * which were skipped.
   */
  async bulkRecycleTasks(adminId: string, taskIds: string[]) {
    const recycled: { id: string; newTaskId: string }[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const taskId of taskIds) {
      try {
        const task = await this.recycleTask(adminId, taskId);
        recycled.push({ id: taskId, newTaskId: task.id });
      } catch (err) {
        skipped.push({
          id: taskId,
          reason:
            err instanceof BadRequestException ||
            err instanceof NotFoundException
              ? err.message
              : 'Could not recycle this task',
        });
      }
    }

    return { recycled, skipped };
  }

  /**
   * Submit a task completion. Screenshot proof is required — this is
   * always a URL to an uploaded image (see UploadsModule), never a link
   * the user just types in, so admin review has something to actually
   * verify against.
   */
  async completeTask(
    userId: string,
    taskId: string,
    submissionData: Record<string, unknown> | undefined,
    screenshotUrl: string,
  ) {
    if (!screenshotUrl) {
      throw new BadRequestException(
        'A screenshot proving task completion is required',
      );
    }

    return db.transaction(async (tx) => {
      const subscription = await tx.query.planSubscriptions.findFirst({
        where: and(
          eq(planSubscriptions.userId, userId),
          eq(planSubscriptions.status, 'active'),
        ),
      });

      if (!subscription) {
        throw new BadRequestException(
          'You need an active plan to complete tasks',
        );
      }

      const task = await tx.query.tasks.findFirst({
        where: and(eq(tasks.id, taskId), eq(tasks.status, 'active')),
      });

      if (!task) {
        throw new NotFoundException('Active task not found');
      }

      const existingCompletion = await tx.query.taskCompletions.findFirst({
        where: and(
          eq(taskCompletions.userId, userId),
          eq(taskCompletions.taskId, taskId),
        ),
      });

      if (existingCompletion) {
        throw new BadRequestException('You have already completed this task');
      }

      let ad: { id: string } | undefined;
      if (task.adId) {
        const adRow = await tx.query.ads.findFirst({
          where: eq(ads.id, task.adId),
        });

        if (!adRow || adRow.status !== 'active') {
          throw new NotFoundException('Active task not found');
        }

        if (adRow.userId === userId) {
          throw new BadRequestException(
            'You cannot complete your own ad campaign',
          );
        }

        if (adRow.remainingSlots <= 0) {
          throw new BadRequestException('This campaign has no remaining slots');
        }

        ad = adRow;
      }

      const startOfDay = startOfTaskDay();

      const todayCompletions = await tx.query.taskCompletions.findMany({
        where: and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, startOfDay),
        ),
      });

      if (todayCompletions.length >= subscription.dailyTaskLimit) {
        throw new BadRequestException('Daily task limit reached');
      }

      // New completion starts pending — reward is only credited once an
      // admin reviews the screenshot and approves it (see approveCompletion).
      const [completion] = await tx
        .insert(taskCompletions)
        .values({
          userId,
          taskId,
          adId: ad?.id,
          reward: task.reward,
          submissionData,
          screenshotUrl,
          status: 'pending',
        })
        .returning();

      return completion;
    });
  }

  /**
   * Get user's task completions, each with its task attached.
   */
  async getMyCompletions(userId: string) {
    const rows = await db
      .select({ completion: taskCompletions, task: tasks })
      .from(taskCompletions)
      .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(taskCompletions.userId, userId))
      .orderBy(desc(taskCompletions.completedAt));

    return rows.map((r) => ({ ...r.completion, task: r.task ?? undefined }));
  }

  /**
   * Get a user's completion, with its task attached.
   */
  async getCompletion(userId: string, completionId: string) {
    const [row] = await db
      .select({ completion: taskCompletions, task: tasks })
      .from(taskCompletions)
      .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(
        and(
          eq(taskCompletions.id, completionId),
          eq(taskCompletions.userId, userId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Task completion not found');
    }

    return { ...row.completion, task: row.task ?? undefined };
  }

  /**
   * Admin: get every pending task completion awaiting screenshot review,
   * each with its task and the submitting user attached.
   */
  async getPendingCompletions() {
    return this.getCompletions('pending');
  }

  /**
   * Admin: list task completions for the review page, filtered by status
   * ('all' for every status), newest first, each with its task and the
   * submitting user attached. Reviewed history only grows, so everything
   * but the pending queue is capped at the most recent
   * COMPLETIONS_HISTORY_LIMIT rows.
   */
  async getCompletions(
    status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
  ) {
    const query = db
      .select({
        completion: taskCompletions,
        task: tasks,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          email: users.email,
        },
      })
      .from(taskCompletions)
      .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .leftJoin(users, eq(taskCompletions.userId, users.id))
      .where(status === 'all' ? undefined : eq(taskCompletions.status, status))
      .orderBy(desc(taskCompletions.completedAt));

    const rows =
      status === 'pending'
        ? await query
        : await query.limit(COMPLETIONS_HISTORY_LIMIT);

    return rows.map((r) => ({
      ...r.completion,
      task: r.task ?? undefined,
      user: r.user ?? undefined,
    }));
  }

  /**
   * Admin: approve a task completion. Credits the reward to the user's
   * task wallet.
   */
  async approveCompletion(
    adminId: string,
    completionId: string,
    note?: string,
  ) {
    const [row] = await db
      .select({ completion: taskCompletions, task: tasks })
      .from(taskCompletions)
      .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(taskCompletions.id, completionId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Task completion not found');
    }

    const completion = { ...row.completion, task: row.task ?? undefined };

    if (completion.status !== 'pending') {
      throw new BadRequestException('Only pending completions can be approved');
    }

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(taskCompletions)
        .set({
          status: 'approved',
          rejectionReason: note,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        })
        .where(eq(taskCompletions.id, completionId))
        .returning();

      await this.walletService.credit(
        {
          userId: completion.userId,
          walletType: 'task',
          amount: completion.reward,
          type: 'task_reward',
          reference: completion.id,
          description: `Reward for task "${completion.task?.title ?? completion.taskId}"`,
        },
        tx,
      );

      if (completion.adId) {
        const adRow = await tx.query.ads.findFirst({
          where: eq(ads.id, completion.adId),
        });

        if (adRow) {
          const remainingSlots = Math.max(0, adRow.remainingSlots - 1);
          const campaignDone = remainingSlots === 0;

          await tx
            .update(ads)
            .set({
              remainingSlots,
              status: campaignDone ? 'completed' : adRow.status,
              updatedAt: new Date(),
            })
            .where(eq(ads.id, adRow.id));

          if (campaignDone && adRow.taskId) {
            await tx
              .update(tasks)
              .set({ status: 'inactive', updatedAt: new Date() })
              .where(eq(tasks.id, adRow.taskId));
          }
        }
      }

      await this.auditService.log({
        actorId: adminId,
        action: 'approve',
        entityType: 'task',
        entityId: completionId,
        description: `Approved task completion for "${completion.task?.title ?? completion.taskId}"`,
        oldValues: { status: completion.status },
        newValues: { status: 'approved', reward: completion.reward },
        tx,
      });

      const completionUser = await tx.query.users.findFirst({
        where: eq(users.id, completion.userId),
      });
      if (completionUser) {
        this.mailer
          ?.sendTaskApproved(
            completionUser.email,
            completionUser.firstName,
            completion.task?.title ?? 'Task',
            completion.reward,
          )
          .catch((err) =>
            this.logger.error(
              `Failed to send task-approved email to ${completionUser.email}`,
              err instanceof Error ? err.stack : err,
            ),
          );

        this.notificationsService
          ?.create({
            userId: completionUser.id,
            title: 'Task approved',
            message: `Your submission for "${completion.task?.title ?? 'a task'}" was approved. ₦${completion.reward} has been added to your task wallet.`,
            type: 'task_approved',
            metadata: {
              taskId: completion.taskId,
              completionId: completion.id,
              reward: completion.reward,
            },
          })
          .catch((err) =>
            this.logger.error(
              `Failed to create task-approved notification for user ${completionUser.id}`,
              err instanceof Error ? err.stack : err,
            ),
          );
      }

      return updated;
    });
  }

  /**
   * Admin: reject a task completion. No reward is credited.
   */
  async rejectCompletion(adminId: string, completionId: string, note?: string) {
    const [row] = await db
      .select({ completion: taskCompletions, task: tasks })
      .from(taskCompletions)
      .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(taskCompletions.id, completionId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Task completion not found');
    }

    const completion = { ...row.completion, task: row.task ?? undefined };

    if (completion.status !== 'pending') {
      throw new BadRequestException('Only pending completions can be rejected');
    }

    const [updated] = await db
      .update(taskCompletions)
      .set({
        status: 'rejected',
        rejectionReason: note,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      })
      .where(eq(taskCompletions.id, completionId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'reject',
      entityType: 'task',
      entityId: completionId,
      description: 'Rejected task completion',
      oldValues: { status: completion.status },
      newValues: { status: 'rejected', rejectionReason: note },
    });

    const completionUser = await db.query.users.findFirst({
      where: eq(users.id, completion.userId),
    });
    if (completionUser) {
      this.mailer
        ?.sendTaskRejected(
          completionUser.email,
          completionUser.firstName,
          completion.task?.title ?? 'Task',
          note,
        )
        .catch((err) =>
          this.logger.error(
            `Failed to send task-rejected email to ${completionUser.email}`,
            err instanceof Error ? err.stack : err,
          ),
        );

      this.notificationsService
        ?.create({
          userId: completionUser.id,
          title: 'Task rejected',
          message: `Your submission for "${completion.task?.title ?? 'a task'}" was rejected.${note ? ` Reason: ${note}` : ''}`,
          type: 'task_rejected',
          metadata: {
            taskId: completion.taskId,
            completionId: completion.id,
            reason: note,
          },
        })
        .catch((err) =>
          this.logger.error(
            `Failed to create task-rejected notification for user ${completionUser.id}`,
            err instanceof Error ? err.stack : err,
          ),
        );
    }

    return updated;
  }
}
