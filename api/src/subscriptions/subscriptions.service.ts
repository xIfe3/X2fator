import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db, planSubscriptions, plans } from '../database';

import { ReferralsService } from '../referrals/referrals.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly walletService: WalletService,
    private readonly referralsService: ReferralsService,
  ) {}

  /**
   * Purchase a plan, or upgrade to a higher-ranked one.
   *
   * Users can only ever move up in plan rank — this checks both their
   * current active plan (if any) and the highest rank they've ever
   * held (even from an expired/cancelled subscription), so there's no
   * way to "reset" by letting a plan lapse and rebuying a lower tier.
   *
   * Everything happens inside one database transaction:
   * 1. Validate the plan and its rank against the user's history
   * 2. Cancel any existing active subscription (upgrade = fresh start,
   *    no proration)
   * 3. Debit the user's account wallet for the full new-plan price
   * 4. Create the new subscription
   * 5. Process referral commission
   *
   * If any step fails, the entire transaction is rolled back.
   */
  async purchasePlan(userId: string, planId: string) {
    return db.transaction(async (tx) => {
      // 1. Get active plan
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
        with: { plan: true },
      });

      const highestHeldRank = await this.getHighestHeldRank(userId, tx);

      if (plan.rank <= highestHeldRank) {
        throw new BadRequestException(
          'You can only upgrade to a higher-ranked plan',
        );
      }

      // 2. Cancel any existing active subscription — upgrading starts
      // the new plan fresh, no proration of remaining time/value.
      if (existingSubscription) {
        await tx
          .update(planSubscriptions)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(planSubscriptions.id, existingSubscription.id));
      }

      const startsAt = new Date();

      const reference = this.generateReference('PLAN');

      // 3. Debit account wallet
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

      // 4. Create subscription
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
          status: 'active',
        })
        .returning();

      // 5. Process referral commission
      //
      // This uses the same transaction, so if referral
      // processing fails, the subscription and wallet
      // debit are rolled back as well.
      await this.referralsService.processReferralCommission(
        userId,
        subscription.id,
        tx,
      );

      return subscription;
    });
  }

  /**
   * Highest plan rank the user has ever held, across every subscription
   * regardless of status — used to enforce upgrade-only purchases even
   * after a plan expires or is cancelled.
   */
  private async getHighestHeldRank(
    userId: string,
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ) {
    const rows = await tx
      .select({ rank: plans.rank })
      .from(planSubscriptions)
      .innerJoin(plans, eq(planSubscriptions.planId, plans.id))
      .where(eq(planSubscriptions.userId, userId));

    return rows.reduce((max, row) => Math.max(max, row.rank), 0);
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
   * Generate a unique-ish transaction reference.
   */
  private generateReference(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
