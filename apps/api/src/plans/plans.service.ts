import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';

import { db } from '@2xfactor/database';
import { plans, planSubscriptions } from '@2xfactor/database';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PlansService {
  constructor(private readonly auditService: AuditService) {}
  /**
   * Get all active plans for users.
   */
  async findActivePlans() {
    return db.query.plans.findMany({
      where: eq(plans.status, 'active'),
      orderBy: (plans, { asc }) => [asc(plans.price)],
    });
  }

  /**
   * Get all plans.
   * Intended for admin use.
   */
  async findAll() {
    return db.query.plans.findMany({
      orderBy: (plans, { desc }) => [desc(plans.createdAt)],
    });
  }

  /**
   * Get a single active plan.
   */
  async findActiveById(id: string) {
    const plan = await db.query.plans.findFirst({
      where: and(eq(plans.id, id), eq(plans.status, 'active')),
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  /**
   * Get any plan.
   * Intended for admin use.
   */
  async findById(id: string) {
    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, id),
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  /**
   * Create a plan.
   */
  async create(adminId: string, data: {
    name: string;
    description?: string;
    price: string;
    durationDays: number;
    dailyTaskLimit?: number;
    dailyReward?: string;
    referralRewardRate?: string;
    minimumWithdrawal?: string;
    status?: 'draft' | 'active' | 'inactive';
    isFeatured?: boolean;
  }) {
    if (Number(data.price) <= 0) {
      throw new BadRequestException('Plan price must be greater than zero');
    }

    if (data.durationDays <= 0) {
      throw new BadRequestException('Duration must be greater than zero');
    }

    if (data.dailyTaskLimit !== undefined && data.dailyTaskLimit < 0) {
      throw new BadRequestException('Daily task limit cannot be negative');
    }

    if (data.dailyReward !== undefined && Number(data.dailyReward) < 0) {
      throw new BadRequestException('Daily reward cannot be negative');
    }

    if (
      data.referralRewardRate !== undefined &&
      Number(data.referralRewardRate) < 0
    ) {
      throw new BadRequestException('Referral reward rate cannot be negative');
    }

    if (
      data.minimumWithdrawal !== undefined &&
      Number(data.minimumWithdrawal) < 0
    ) {
      throw new BadRequestException('Minimum withdrawal cannot be negative');
    }

    const existing = await db.query.plans.findFirst({
      where: eq(plans.name, data.name),
    });

    if (existing) {
      throw new ConflictException('A plan with this name already exists');
    }

    const [plan] = await db
      .insert(plans)
      .values({
        name: data.name,
        description: data.description,
        price: data.price,
        durationDays: data.durationDays,
        dailyTaskLimit: data.dailyTaskLimit ?? 0,
        dailyReward: data.dailyReward ?? '0',
        referralRewardRate: data.referralRewardRate ?? '0',
        minimumWithdrawal: data.minimumWithdrawal ?? '0',
        status: data.status ?? 'draft',
        isFeatured: data.isFeatured ?? false,
      })
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'create',
      entityType: 'plan',
      entityId: plan.id,
      description: `Created plan "${plan.name}"`,
      newValues: { ...data },
    });

    return plan;
  }

  /**
   * Update a plan.
   */
  async update(
    adminId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: string;
      durationDays?: number;
      dailyTaskLimit?: number;
      dailyReward?: string;
      referralRewardRate?: string;
      minimumWithdrawal?: string;
      status?: 'draft' | 'active' | 'inactive';
      isFeatured?: boolean;
    },
  ) {
    const existing = await this.findById(id);

    if (data.price !== undefined && Number(data.price) <= 0) {
      throw new BadRequestException('Plan price must be greater than zero');
    }

    if (data.durationDays !== undefined && data.durationDays <= 0) {
      throw new BadRequestException('Duration must be greater than zero');
    }

    if (data.dailyTaskLimit !== undefined && data.dailyTaskLimit < 0) {
      throw new BadRequestException('Daily task limit cannot be negative');
    }

    if (data.dailyReward !== undefined && Number(data.dailyReward) < 0) {
      throw new BadRequestException('Daily reward cannot be negative');
    }

    if (
      data.referralRewardRate !== undefined &&
      Number(data.referralRewardRate) < 0
    ) {
      throw new BadRequestException('Referral reward rate cannot be negative');
    }

    if (
      data.minimumWithdrawal !== undefined &&
      Number(data.minimumWithdrawal) < 0
    ) {
      throw new BadRequestException('Minimum withdrawal cannot be negative');
    }

    if (data.name !== undefined && data.name !== existing.name) {
      const duplicate = await db.query.plans.findFirst({
        where: and(eq(plans.name, data.name), ne(plans.id, id)),
      });

      if (duplicate) {
        throw new ConflictException('A plan with this name already exists');
      }
    }

    const [updatedPlan] = await db
      .update(plans)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'plan',
      entityId: id,
      description: `Updated plan "${existing.name}"`,
      oldValues: { ...existing },
      newValues: { ...data },
    });

    return updatedPlan;
  }

  /**
   * Delete a plan.
   *
   * We do not allow deleting a plan that has subscriptions.
   */
  async remove(adminId: string, id: string) {
    const existing = await this.findById(id);

    const subscription = await db.query.planSubscriptions.findFirst({
      where: eq(planSubscriptions.planId, id),
    });

    if (subscription) {
      throw new ConflictException(
        'Cannot delete a plan that has subscriptions. Deactivate it instead.',
      );
    }

    await db.delete(plans).where(eq(plans.id, id));

    await this.auditService.log({
      actorId: adminId,
      action: 'delete',
      entityType: 'plan',
      entityId: id,
      description: `Deleted plan "${existing.name}"`,
      oldValues: { ...existing },
    });

    return {
      message: 'Plan deleted successfully',
    };
  }
}
