import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte } from 'drizzle-orm';

import {
  db,
  tasks,
  taskCompletions,
  planSubscriptions,
} from '@2xfactor/database';

import { WalletService } from '../wallet/wallet.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Create a task.
   */
  async createTask(dto: CreateTaskDto) {
    const [task] = await db
      .insert(tasks)
      .values({
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        durationSeconds: dto.durationSeconds,
        status: 'active',
      })
      .returning();

    return task;
  }

  /**
   * Get all active tasks.
   */
  async getTasks() {
    return db.query.tasks.findMany({
      where: eq(tasks.status, 'active'),
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
   * Update a task.
   */
  async updateTask(taskId: string, dto: UpdateTaskDto) {
    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const [updated] = await db
      .update(tasks)
      .set({
        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.reward !== undefined && {
          reward: dto.reward,
        }),

        ...(dto.durationSeconds !== undefined && {
          durationSeconds: dto.durationSeconds,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),

        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return updated;
  }

  /**
   * Complete a task.
   */
  async completeTask(
    userId: string,
    taskId: string,
    submissionData?: Record<string, unknown>,
    screenshotUrl?: string,
  ) {
    return db.transaction(async (tx) => {
      /**
       * Get active task.
       */
      const task = await tx.query.tasks.findFirst({
        where: and(eq(tasks.id, taskId), eq(tasks.status, 'active')),
      });

      if (!task) {
        throw new NotFoundException('Active task not found');
      }

      /**
       * Get user's active subscription.
       */
      const subscription = await tx.query.planSubscriptions.findFirst({
        where: and(
          eq(planSubscriptions.userId, userId),
          eq(planSubscriptions.status, 'active'),
        ),
      });

      if (!subscription) {
        throw new BadRequestException(
          'You need an active subscription to complete tasks',
        );
      }

      /**
       * Check whether the task has already
       * been completed by this user.
       */
      const existingCompletion = await tx.query.taskCompletions.findFirst({
        where: and(
          eq(taskCompletions.userId, userId),
          eq(taskCompletions.taskId, taskId),
          eq(taskCompletions.subscriptionId, subscription.id),
        ),
      });

      if (existingCompletion) {
        throw new BadRequestException('You have already completed this task');
      }

      /**
       * Check daily task limit.
       */
      const startOfDay = new Date();

      startOfDay.setHours(0, 0, 0, 0);

      const todayCompletions = await tx.query.taskCompletions.findMany({
        where: and(
          eq(taskCompletions.userId, userId),
          eq(taskCompletions.subscriptionId, subscription.id),
          gte(taskCompletions.completedAt, startOfDay),
        ),
      });

      if (todayCompletions.length >= subscription.dailyTaskLimit) {
        throw new BadRequestException('Daily task limit reached');
      }

      /**
       * Create task completion.
       *
       * New completion starts as pending.
       * It gets credited after approval.
       */
      const [completion] = await tx
        .insert(taskCompletions)
        .values({
          userId,
          taskId,
          subscriptionId: subscription.id,
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
   * Get user's task completions.
   */
  async getMyCompletions(userId: string) {
    return db.query.taskCompletions.findMany({
      where: eq(taskCompletions.userId, userId),
      orderBy: [desc(taskCompletions.completedAt)],
      with: {
        task: true,
      },
    });
  }

  /**
   * Get a user's completion.
   */
  async getCompletion(userId: string, completionId: string) {
    const completion = await db.query.taskCompletions.findFirst({
      where: and(
        eq(taskCompletions.id, completionId),
        eq(taskCompletions.userId, userId),
      ),
      with: {
        task: true,
      },
    });

    if (!completion) {
      throw new NotFoundException('Task completion not found');
    }

    return completion;
  }
}
