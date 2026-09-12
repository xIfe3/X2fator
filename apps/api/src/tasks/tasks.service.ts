import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte } from 'drizzle-orm';

import { ads, db, tasks, taskCompletions } from '@2xfactor/database';

import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
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
   * Get all active tasks available to a user to complete. Excludes
   * ad-generated tasks the user themselves funded — you can't complete
   * (and get paid for) your own ad campaign.
   */
  async getTasks(userId: string) {
    const rows = await db
      .select({ task: tasks, ad: ads })
      .from(tasks)
      .leftJoin(ads, eq(tasks.adId, ads.id))
      .where(eq(tasks.status, 'active'))
      .orderBy(desc(tasks.createdAt));

    return rows
      .filter((r) => !r.ad || r.ad.userId !== userId)
      .map((r) => ({
        ...r.task,
        source: r.task.adId ? ('ad' as const) : ('admin' as const),
      }));
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
          throw new BadRequestException(
            'This campaign has no remaining slots',
          );
        }

        ad = adRow;
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayCompletions = await tx.query.taskCompletions.findMany({
        where: and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, startOfDay),
        ),
      });

      const dailyTaskLimit = 10;
      if (todayCompletions.length >= dailyTaskLimit) {
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
   * each with its task attached.
   */
  async getPendingCompletions() {
    const rows = await db
      .select({ completion: taskCompletions, task: tasks })
      .from(taskCompletions)
      .leftJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(taskCompletions.status, 'pending'))
      .orderBy(desc(taskCompletions.completedAt));

    return rows.map((r) => ({ ...r.completion, task: r.task ?? undefined }));
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

      return updated;
    });
  }

  /**
   * Admin: reject a task completion. No reward is credited.
   */
  async rejectCompletion(adminId: string, completionId: string, note?: string) {
    const completion = await db.query.taskCompletions.findFirst({
      where: eq(taskCompletions.id, completionId),
    });

    if (!completion) {
      throw new NotFoundException('Task completion not found');
    }

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

    return updated;
  }
}
