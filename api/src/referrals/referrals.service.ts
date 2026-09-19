import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '../database';
import {
  earnings,
  planSubscriptions,
  referrals,
  users,
  plans,
} from '../database';

import { WalletService, type DbTransaction } from '../wallet/wallet.service';

@Injectable()
export class ReferralsService {
  constructor(@Optional() private readonly walletService?: WalletService) {}

  async getMyReferralInfo(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const referredUsers = await db
      .select({
        id: referrals.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        status: referrals.status,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referredUserId, users.id))
      .where(eq(referrals.referrerId, userId));

    return {
      referralCode: user.referralCode,
      totalReferrals: referredUsers.length,
      referrals: referredUsers,
    };
  }

  async getMyReferrals(userId: string) {
    return db
      .select({
        id: referrals.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        status: referrals.status,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referredUserId, users.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getMyReferralEarnings(userId: string) {
    return db.query.earnings.findMany({
      where: and(eq(earnings.userId, userId), eq(earnings.source, 'referral')),
      orderBy: (earnings, { desc }) => [desc(earnings.createdAt)],
    });
  }

  /**
   * Top earners by total referral commission earned. `period: 'week'`
   * restricts to earnings credited in the last 7 days; 'all' (default)
   * is lifetime.
   */
  async getLeaderboard(period: 'week' | 'all' = 'all', limit = 15) {
    const totalEarned = sql<string>`coalesce(sum(${earnings.amount}), 0)`;

    const conditions = [eq(earnings.source, 'referral')];

    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      conditions.push(gte(earnings.earningDate, weekAgo));
    }

    return db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        totalEarned,
      })
      .from(earnings)
      .innerJoin(users, eq(earnings.userId, users.id))
      .where(and(...conditions))
      .groupBy(users.id, users.firstName, users.lastName)
      .orderBy(desc(totalEarned), users.createdAt)
      .limit(limit);
  }

  /**
   * Called after a referred user successfully
   * purchases a plan.
   */
  async processReferralCommission(
    referredUserId: string,
    subscriptionId: string,
    tx: DbTransaction,
  ) {
    const referredUser = await tx.query.users.findFirst({
      where: eq(users.id, referredUserId),
    });

    if (!referredUser?.referredById) {
      return null;
    }

    const referrerId = referredUser.referredById;

    const subscription = await tx.query.planSubscriptions.findFirst({
      where: eq(planSubscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = await tx.query.plans.findFirst({
      where: eq(plans.id, subscription.planId),
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Use the rate stored on the subscription.
    // This preserves the rate that applied when the subscription was purchased.
    const commissionRate = Number(subscription.referralRewardRate);

    if (commissionRate <= 0) {
      return null;
    }

    const commission = (Number(subscription.amountPaid) * commissionRate) / 100;

    if (commission <= 0) {
      return null;
    }

    const existingReferral = await tx.query.referrals.findFirst({
      where: and(
        eq(referrals.referrerId, referrerId),
        eq(referrals.referredUserId, referredUserId),
      ),
    });

    let referral = existingReferral;

    if (!referral) {
      const [createdReferral] = await tx
        .insert(referrals)
        .values({
          referrerId,
          referredUserId,
          commissionRate: commissionRate.toFixed(4),
          totalCommission: commission.toFixed(2),
          status: 'active',
        })
        .returning();

      referral = createdReferral;
    } else {
      const newTotal = Number(referral.totalCommission) + commission;

      const [updatedReferral] = await tx
        .update(referrals)
        .set({
          totalCommission: newTotal.toFixed(2),
          commissionRate: commissionRate.toFixed(4),
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(referrals.id, referral.id))
        .returning();

      referral = updatedReferral;
    }

    const reference = this.generateReference('REF');

    await this.walletService!.credit(
      {
        userId: referrerId,
        walletType: 'referral',
        amount: commission.toFixed(2),
        type: 'referral_commission',
        reference,
        description: 'Referral commission',
        metadata: {
          referralId: referral.id,
          referredUserId,
          subscriptionId,
          planId: plan.id,
          commissionRate,
        },
      },
      tx,
    );

    await tx.insert(earnings).values({
      userId: referrerId,
      source: 'referral',
      amount: commission.toFixed(2),
      status: 'credited',
      reference,
      description: 'Referral commission from plan purchase',
      metadata: {
        referralId: referral.id,
        referredUserId,
        subscriptionId,
        planId: plan.id,
        commissionRate,
      },
      earningDate: new Date(),
    });

    return {
      referralId: referral.id,
      referrerId,
      referredUserId,
      commission: commission.toFixed(2),
    };
  }

  // ---- Admin ------------------------------------------------------

  /**
   * Admin: platform-wide referral stats — total referral relationships,
   * total commission ever paid out, and how many are currently active.
   */
  async getAdminStats() {
    const [row] = await db
      .select({
        totalReferrals: sql<number>`count(*)::int`,
        activeReferrals: sql<number>`count(*) filter (where ${referrals.status} = 'active')::int`,
        totalCommission: sql<string>`coalesce(sum(${referrals.totalCommission}), 0)::text`,
      })
      .from(referrals);

    return row;
  }

  /**
   * Admin: every referrer→referred relationship, with both users'
   * names/emails attached — the referral tree, flattened to one row
   * per edge (a referrer can appear on multiple rows).
   */
  async getAllReferrals() {
    const rows = await db.execute(sql`
      select
        r.id,
        r.status,
        r.commission_rate as "commissionRate",
        r.total_commission as "totalCommission",
        r.created_at as "createdAt",
        ru.id as "referrerId",
        ru.first_name as "referrerFirstName",
        ru.last_name as "referrerLastName",
        ru.email as "referrerEmail",
        du.id as "referredId",
        du.first_name as "referredFirstName",
        du.last_name as "referredLastName",
        du.email as "referredEmail",
        du.phone as "referredPhone"
      from referrals r
      inner join users ru on ru.id = r.referrer_id
      inner join users du on du.id = r.referred_user_id
      order by r.created_at desc
    `);

    return rows.rows as Array<{
      id: string;
      status: string;
      commissionRate: string;
      totalCommission: string;
      createdAt: string;
      referrerId: string;
      referrerFirstName: string;
      referrerLastName: string;
      referrerEmail: string;
      referredId: string;
      referredFirstName: string;
      referredLastName: string;
      referredEmail: string;
      referredPhone: string | null;
    }>;
  }

  /**
   * Admin: a simple, explainable fraud signal — referrers who picked
   * up an unusually large burst of referred signups within a single
   * hour. Phone/email are unique per user in this schema (no
   * shared-device signal is possible there), so a rapid signup burst
   * from one referral code is the clearest available proxy for a
   * self-referral / bot ring rather than organic word-of-mouth growth.
   */
  async getSuspiciousReferrals(burstThreshold = 5) {
    const rows = await db.execute(sql`
      select
        ru.id as "referrerId",
        ru.first_name as "referrerFirstName",
        ru.last_name as "referrerLastName",
        ru.email as "referrerEmail",
        date_trunc('hour', r.created_at) as "hourBucket",
        count(*)::int as "signupsInHour"
      from referrals r
      inner join users ru on ru.id = r.referrer_id
      group by ru.id, ru.first_name, ru.last_name, ru.email, date_trunc('hour', r.created_at)
      having count(*) >= ${burstThreshold}
      order by count(*) desc, "hourBucket" desc
    `);

    return rows.rows;
  }

  private generateReference(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
