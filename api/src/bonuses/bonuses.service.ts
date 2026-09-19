import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db, earnings, users } from '../database';
import { WalletService } from '../wallet/wallet.service';

import { SiteContentService } from '../site-content/site-content.service';

const STREAK_MILESTONE_DAYS = 30;

const DEFAULT_DAILY_BONUS = {
  enabled: true,
  amount: '50.00',
  milestoneAmount: '5000.00',
};

@Injectable()
export class BonusesService {
  constructor(
    private readonly walletService: WalletService,
    private readonly siteContentService: SiteContentService,
  ) {}

  async getAdminSettings() {
    return this.getSettings();
  }

  /**
   * Check-in overview for the admin dashboard: how many users have
   * claimed today, total ever paid out via the daily bonus, and the
   * current streak leaderboard.
   */
  async getAdminStats() {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [{ claimedToday }] = await db
      .select({ claimedToday: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.lastBonusClaimDate, todayStart));

    const [{ totalPaid }] = await db
      .select({
        totalPaid: sql<string>`coalesce(sum(${earnings.amount}), 0)::text`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.source, 'bonus'),
          sql`${earnings.metadata} ->> 'source' = 'daily_login_bonus'`,
        ),
      );

    const topStreaks = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        currentStreak: users.currentStreak,
        longestStreak: users.longestStreak,
        lastBonusClaimDate: users.lastBonusClaimDate,
      })
      .from(users)
      .where(sql`${users.currentStreak} > 0`)
      .orderBy(desc(users.currentStreak))
      .limit(10);

    return { claimedToday, totalPaid, topStreaks };
  }

  async updateAdminSettings(params: {
    enabled?: boolean;
    amount?: string;
    milestoneAmount?: string;
  }) {
    const current = await this.getSettings();
    const amount = params.amount ?? current.amount;
    const milestoneAmount = params.milestoneAmount ?? current.milestoneAmount;

    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      throw new BadRequestException('Bonus amount must be greater than zero');
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(milestoneAmount) ||
      Number(milestoneAmount) <= 0
    ) {
      throw new BadRequestException(
        'Milestone amount must be greater than zero',
      );
    }

    await this.siteContentService.updateSection('daily_bonus', {
      enabled: params.enabled ?? current.enabled,
      amount: Number(amount).toFixed(2),
      milestoneAmount: Number(milestoneAmount).toFixed(2),
    });

    return this.getSettings();
  }

  async getDailyStatus(userId: string) {
    const settings = await this.getSettings();
    const user = await this.getUser(userId);
    const today = this.todayKey();
    const lastClaim = this.dateKey(user.lastBonusClaimDate);
    const claimed = lastClaim === today;

    const nextStreak = this.computeNextStreak(user, today);
    const nextIsMilestone = !claimed && nextStreak === STREAK_MILESTONE_DAYS;

    return {
      enabled: settings.enabled,
      claimed,
      amount: nextIsMilestone ? settings.milestoneAmount : settings.amount,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      nextStreak: claimed ? user.currentStreak : nextStreak,
      nextIsMilestone,
      milestoneDays: STREAK_MILESTONE_DAYS,
      nextClaimAt: claimed ? this.nextClaimDate().toISOString() : null,
    };
  }

  async claimDailyBonus(userId: string) {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      throw new BadRequestException('Daily bonus is currently unavailable');
    }

    return db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      if (!user) throw new NotFoundException('User not found');

      const today = this.todayKey();
      const lastClaim = this.dateKey(user.lastBonusClaimDate);

      if (lastClaim === today) {
        throw new BadRequestException('Daily bonus already claimed');
      }

      let newStreak = this.computeNextStreak(user, today);
      const isMilestone = newStreak === STREAK_MILESTONE_DAYS;
      const amount = isMilestone ? settings.milestoneAmount : settings.amount;

      if (isMilestone) {
        // Reset after paying out so tomorrow's claim cleanly starts day 1.
        newStreak = 0;
      }

      const longestStreak = Math.max(user.longestStreak, newStreak);
      const reference = `BONUS_${today.replace(/-/g, '')}_${Date.now()}`;

      await this.walletService.credit(
        {
          userId,
          walletType: 'task',
          amount,
          type: 'adjustment',
          reference: `WALLET_${reference}`,
          description: isMilestone
            ? '30-day login streak bonus'
            : 'Daily login bonus',
          metadata: { source: 'daily_login_bonus', claimDate: today },
        },
        tx,
      );

      const [earning] = await tx
        .insert(earnings)
        .values({
          userId,
          source: 'bonus',
          amount,
          status: 'credited',
          reference,
          description: isMilestone
            ? '30-day login streak bonus'
            : 'Daily login bonus',
          metadata: { claimDate: today },
          earningDate: new Date(),
        })
        .returning();

      await tx
        .update(users)
        .set({
          currentStreak: newStreak,
          longestStreak,
          lastBonusClaimDate: new Date(today),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        earning,
        amount,
        isMilestone,
        currentStreak: newStreak,
        longestStreak,
        claimDate: today,
        nextClaimAt: this.nextClaimDate().toISOString(),
      };
    });
  }

  private async getUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Streak continues (currentStreak + 1) only if the last claim was
   * exactly yesterday (UTC). Otherwise — never claimed, or a day was
   * missed — the streak restarts at 1.
   */
  private computeNextStreak(
    user: { currentStreak: number; lastBonusClaimDate: Date | null },
    today: string,
  ) {
    const lastClaim = this.dateKey(user.lastBonusClaimDate);
    const yesterday = this.dateKey(this.addDays(new Date(today), -1));
    return lastClaim === yesterday ? user.currentStreak + 1 : 1;
  }

  private async getSettings() {
    const sections = await this.siteContentService.getAll();
    const configured = sections.daily_bonus;
    const amount = configured?.amount;
    const milestoneAmount = configured?.milestoneAmount;
    return {
      enabled: configured?.enabled !== false,
      amount:
        typeof amount === 'string' && Number(amount) > 0
          ? Number(amount).toFixed(2)
          : DEFAULT_DAILY_BONUS.amount,
      milestoneAmount:
        typeof milestoneAmount === 'string' && Number(milestoneAmount) > 0
          ? Number(milestoneAmount).toFixed(2)
          : DEFAULT_DAILY_BONUS.milestoneAmount,
    };
  }

  private todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private dateKey(date: Date | string | null) {
    if (!date) return null;
    return new Date(date).toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private nextClaimDate() {
    const next = new Date();
    next.setUTCHours(24, 0, 0, 0);
    return next;
  }
}
