import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db, planSubscriptions, plans } from '@2xfactor/database';

import { ReferralsService } from '../referrals/referrals.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly walletService: WalletService,
    private readonly referralsService: ReferralsService,
  ) {}

  /**
   * Purchase a plan.
   */
  async purchasePlan(userId: string, planId: string) {
    return db.transaction(async (tx) => {
      const plan = await tx.query.plans.findFirst({
        where: and(eq(plans.id, planId), eq(plans.status, 'active')),
      });

      if (!plan) {
        throw new NotFoundException('Active plan not found');
      }

      const existingSubscription = await tx.query.planSubscriptions.findFirst({
        where: and(
          eq(planSubscriptions.userId, userId),
          eq(planSubscriptions.status, 'active'),
        ),
      });

      if (existingSubscription) {
        throw new BadRequestException('You already have an active plan');
      }

      const now = new Date();

      const startsAt = now;

      const endsAt = new Date(
        now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
      );

      const reference = this.generateReference('PLAN');

      /**
       * Debit the user's account wallet.
       *
       * Pass tx so this debit happens inside
       * the same database transaction.
       */
      await this.walletService.debit(
        {
          userId,
          walletType: 'account',
          amount: plan.price,
          type: 'plan_purchase',
          reference,
          description: `Purchase of ${plan.name} plan`,
          metadata: {
            planId: plan.id,
            planName: plan.name,
          },
        },
        tx,
      );

      /**
       * Create subscription.
       */
      const [subscription] = await tx
        .insert(planSubscriptions)
        .values({
          userId,
          planId: plan.id,
          amountPaid: plan.price,

          dailyTaskLimit: plan.dailyTaskLimit,
          dailyReward: plan.dailyReward,
          referralRewardRate: plan.referralRewardRate,

          startsAt,
          endsAt,
          status: 'active',
        })
        .returning();

      /**
       * Process referral commission.
       *
       * This also uses the same transaction.
       */
      await this.referralsService.processReferralCommission(
        userId,
        subscription.id,
        tx,
      );

      return subscription;
    });
  }

  /**
   * Get user's active subscription.
   */
  async getActiveSubscription(userId: string) {
    const subscription = await db.query.planSubscriptions.findFirst({
      where: and(
        eq(planSubscriptions.userId, userId),
        eq(planSubscriptions.status, 'active'),
      ),
      with: {
        plan: true,
      },
    });

    return subscription ?? null;
  }

  /**
   * Get all subscriptions belonging to a user.
   */
  async getUserSubscriptions(userId: string) {
    return db.query.planSubscriptions.findMany({
      where: eq(planSubscriptions.userId, userId),
      orderBy: [desc(planSubscriptions.createdAt)],
      with: {
        plan: true,
      },
    });
  }

  /**
   * Cancel an active subscription.
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    const subscription = await db.query.planSubscriptions.findFirst({
      where: and(
        eq(planSubscriptions.id, subscriptionId),
        eq(planSubscriptions.userId, userId),
      ),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new BadRequestException(
        'Only active subscriptions can be cancelled',
      );
    }

    const [updated] = await db
      .update(planSubscriptions)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(planSubscriptions.id, subscriptionId))
      .returning();

    return updated;
  }

  /**
   * Generate a unique-ish reference for transactions.
   */
  private generateReference(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
