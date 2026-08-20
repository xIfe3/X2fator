import { BadRequestException, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db, earnings } from '@2xfactor/database';
import { WalletService } from '../wallet/wallet.service';

import { SiteContentService } from '../site-content/site-content.service';

const DEFAULT_DAILY_BONUS = { enabled: true, amount: '50.00' };

@Injectable()
export class BonusesService {
  constructor(
    private readonly walletService: WalletService,
    private readonly siteContentService: SiteContentService,
  ) {}

  async getAdminSettings() {
    return this.getSettings();
  }

  async updateAdminSettings(params: { enabled?: boolean; amount?: string }) {
    const current = await this.getSettings();
    const amount = params.amount ?? current.amount;

    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      throw new BadRequestException('Bonus amount must be greater than zero');
    }

    await this.siteContentService.updateSection('daily_bonus', {
      enabled: params.enabled ?? current.enabled,
      amount: Number(amount).toFixed(2),
    });

    return this.getSettings();
  }

  async getDailyStatus(userId: string) {
    const today = this.todayKey();
    const settings = await this.getSettings();
    const claim = await this.findClaim(userId, today);
    return {
      enabled: settings.enabled,
      claimed: Boolean(claim),
      amount: settings.amount,
      claimDate: today,
      nextClaimAt: claim ? this.nextClaimDate().toISOString() : null,
    };
  }

  async claimDailyBonus(userId: string) {
    const today = this.todayKey();
    const settings = await this.getSettings();

    if (!settings.enabled) {
      throw new BadRequestException('Daily bonus is currently unavailable');
    }

    return db.transaction(async (tx) => {
      const existing = await tx.query.earnings.findFirst({
        where: and(eq(earnings.userId, userId), eq(earnings.source, 'bonus')),
      });
      const claimedToday =
        existing && this.claimDate(existing.metadata) === today;

      if (claimedToday) {
        throw new BadRequestException('Daily bonus already claimed');
      }

      const reference = `BONUS_${today.replace(/-/g, '')}_${Date.now()}`;
      await this.walletService.credit(
        {
          userId,
          walletType: 'earnings',
          amount: settings.amount,
          type: 'adjustment',
          reference: `WALLET_${reference}`,
          description: 'Daily login bonus',
          metadata: { source: 'daily_login_bonus', claimDate: today },
        },
        tx,
      );

      const [earning] = await tx
        .insert(earnings)
        .values({
          userId,
          source: 'bonus',
          amount: settings.amount,
          status: 'credited',
          reference,
          description: 'Daily login bonus',
          metadata: { claimDate: today },
          earningDate: new Date(),
        })
        .returning();

      return {
        earning,
        amount: settings.amount,
        claimDate: today,
        nextClaimAt: this.nextClaimDate().toISOString(),
      };
    });
  }

  private async findClaim(userId: string, claimDate: string) {
    const bonusEarnings = await db.query.earnings.findMany({
      where: and(eq(earnings.userId, userId), eq(earnings.source, 'bonus')),
    });
    return bonusEarnings.find(
      (earning) => this.claimDate(earning.metadata) === claimDate,
    );
  }

  private async getSettings() {
    const sections = await this.siteContentService.getAll();
    const configured = sections.daily_bonus;
    const amount = configured?.amount;
    return {
      enabled: configured?.enabled !== false,
      amount:
        typeof amount === 'string' && Number(amount) > 0
          ? Number(amount).toFixed(2)
          : DEFAULT_DAILY_BONUS.amount,
    };
  }

  private claimDate(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object' || !('claimDate' in metadata))
      return null;
    const claimDate = (metadata as { claimDate?: unknown }).claimDate;
    return typeof claimDate === 'string' ? claimDate : null;
  }

  private todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private nextClaimDate() {
    const next = new Date();
    next.setUTCHours(24, 0, 0, 0);
    return next;
  }
}
