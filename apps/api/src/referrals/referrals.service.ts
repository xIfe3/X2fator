import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { db } from '@2xfactor/database';
import {
  earnings,
  planSubscriptions,
  referrals,
  users,
  plans,
} from '@2xfactor/database';

import { WalletService, type DbTransaction } from '../wallet/wallet.service';

@Injectable()
export class ReferralsService {
  constructor(private readonly walletService: WalletService) {}

  async getMyReferralInfo(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const referredUsers = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, userId),
    });

    return {
      referralCode: user.referralCode,
      totalReferrals: referredUsers.length,
      referrals: referredUsers,
    };
  }

  async getMyReferrals(userId: string) {
    return db.query.referrals.findMany({
      where: eq(referrals.referrerId, userId),
      orderBy: (referrals, { desc }) => [desc(referrals.createdAt)],
    });
  }

  async getMyReferralEarnings(userId: string) {
    return db.query.earnings.findMany({
      where: and(eq(earnings.userId, userId), eq(earnings.source, 'referral')),
      orderBy: (earnings, { desc }) => [desc(earnings.createdAt)],
    });
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

    const commissionRate = Number(plan.referralRewardRate);

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

    await this.walletService.credit(
      {
        userId: referrerId,
        walletType: 'earnings',
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
