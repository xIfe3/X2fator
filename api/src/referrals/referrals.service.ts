import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

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

  async getLeaderboard() {
    const referralCount = sql<number>`count(${referrals.id})::int`;

    return db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        referralCount,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerId, users.id))
      .where(eq(referrals.status, 'active'))
      .groupBy(users.id, users.firstName, users.lastName)
      .orderBy(desc(referralCount), users.createdAt)
      .limit(3);
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

  private generateReference(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
