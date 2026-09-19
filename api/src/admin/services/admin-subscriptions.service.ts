import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db, planSubscriptions, plans, users } from '../../database';

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
        referralRewardRate: planSubscriptions.referralRewardRate,
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
        referralRewardRate: planSubscriptions.referralRewardRate,
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
}
