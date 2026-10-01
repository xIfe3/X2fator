import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';

import { db, planSubscriptions, plans, users } from '../../database';

import { AuditService } from '../../audit/audit.service';

export interface SubscriptionFilters {
  status?: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired';
  planId?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Investment/plan overview for the admin dashboard: subscription
   * counts by status, and total capital currently deployed in active
   * subscriptions.
   */
  async getStats() {
    const byStatus = await db
      .select({
        status: planSubscriptions.status,
        count: count(),
        totalAmount: sql<string>`coalesce(sum(${planSubscriptions.amountPaid}), 0)::text`,
      })
      .from(planSubscriptions)
      .groupBy(planSubscriptions.status);

    const counts = {
      pending: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
    };
    let activeCapital = '0.00';
    let totalRevenue = '0.00';

    for (const row of byStatus) {
      counts[row.status] = row.count;
      if (row.status === 'active') activeCapital = row.totalAmount;
    }

    const revenueRow = await db
      .select({
        total: sql<string>`coalesce(sum(${planSubscriptions.amountPaid}), 0)::text`,
      })
      .from(planSubscriptions);
    totalRevenue = revenueRow[0]?.total ?? '0.00';

    return {
      counts,
      totalSubscriptions: Object.values(counts).reduce((a, b) => a + b, 0),
      activeCapital,
      totalRevenue,
    };
  }

  /**
   * The full, filterable, paginated list of plan subscriptions — every
   * user's investment across every plan, with plan and user identity
   * attached.
   */
  async getAll(filters: SubscriptionFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));

    const conditions = [
      filters.status ? eq(planSubscriptions.status, filters.status) : undefined,
      filters.planId ? eq(planSubscriptions.planId, filters.planId) : undefined,
      filters.userId ? eq(planSubscriptions.userId, filters.userId) : undefined,
      filters.from
        ? gte(planSubscriptions.createdAt, new Date(filters.from))
        : undefined,
      filters.to ? lte(planSubscriptions.createdAt, new Date(filters.to)) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: planSubscriptions.id,
        amountPaid: planSubscriptions.amountPaid,
        dailyTaskLimit: planSubscriptions.dailyTaskLimit,
        dailyReward: planSubscriptions.dailyReward,
        referralRewardAmount: planSubscriptions.referralRewardAmount,
        startsAt: planSubscriptions.startsAt,
        status: planSubscriptions.status,
        createdAt: planSubscriptions.createdAt,
        planId: plans.id,
        planName: plans.name,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(planSubscriptions)
      .innerJoin(plans, eq(plans.id, planSubscriptions.planId))
      .innerJoin(users, eq(users.id, planSubscriptions.userId));

    const countQuery = db
      .select({ total: count() })
      .from(planSubscriptions)
      .innerJoin(plans, eq(plans.id, planSubscriptions.planId))
      .innerJoin(users, eq(users.id, planSubscriptions.userId));

    const [items, [{ total }]] = await Promise.all([
      (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(planSubscriptions.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      where ? countQuery.where(where) : countQuery,
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getOne(id: string) {
    const row = await db
      .select({
        id: planSubscriptions.id,
        amountPaid: planSubscriptions.amountPaid,
        dailyTaskLimit: planSubscriptions.dailyTaskLimit,
        dailyReward: planSubscriptions.dailyReward,
        referralRewardAmount: planSubscriptions.referralRewardAmount,
        startsAt: planSubscriptions.startsAt,
        status: planSubscriptions.status,
        createdAt: planSubscriptions.createdAt,
        updatedAt: planSubscriptions.updatedAt,
        planId: plans.id,
        planName: plans.name,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(planSubscriptions)
      .innerJoin(plans, eq(plans.id, planSubscriptions.planId))
      .innerJoin(users, eq(users.id, planSubscriptions.userId))
      .where(eq(planSubscriptions.id, id))
      .limit(1);

    if (!row[0]) {
      throw new NotFoundException('Subscription not found');
    }

    return row[0];
  }

  /**
   * Admin cancel of an active subscription. No refund is issued — use a
   * manual wallet adjustment for that if one is owed.
   */
  async cancel(adminId: string, id: string) {
    const subscription = await this.getOne(id);

    if (subscription.status !== 'active') {
      throw new BadRequestException('Only an active subscription can be cancelled');
    }

    await db
      .update(planSubscriptions)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(planSubscriptions.id, id));

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'subscription',
      entityId: id,
      description: `Cancelled ${subscription.planName} subscription for ${subscription.userEmail}`,
      oldValues: { status: subscription.status },
      newValues: { status: 'cancelled' },
    });

    return this.getOne(id);
  }

  /**
   * Restores a cancelled or expired subscription to active — e.g. a user
   * who cancelled by mistake. A user may only hold one active plan, so
   * this is refused while they have another active subscription.
   */
  async reactivate(adminId: string, id: string) {
    const subscription = await this.getOne(id);

    if (subscription.status !== 'cancelled' && subscription.status !== 'expired') {
      throw new BadRequestException(
        'Only a cancelled or expired subscription can be reactivated',
      );
    }

    return db.transaction(async (tx) => {
      const otherActive = await tx.query.planSubscriptions.findFirst({
        where: and(
          eq(planSubscriptions.userId, subscription.userId),
          eq(planSubscriptions.status, 'active'),
          ne(planSubscriptions.id, id),
        ),
      });

      if (otherActive) {
        throw new BadRequestException(
          'This user already has an active subscription. Cancel it first.',
        );
      }

      await tx
        .update(planSubscriptions)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(planSubscriptions.id, id));

      await this.auditService.log({
        actorId: adminId,
        action: 'activate',
        entityType: 'subscription',
        entityId: id,
        description: `Reactivated ${subscription.planName} subscription for ${subscription.userEmail}`,
        oldValues: { status: subscription.status },
        newValues: { status: 'active' },
        tx,
      });

      return { ...subscription, status: 'active' as const, updatedAt: new Date() };
    });
  }
}
