import { BadRequestException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { db, withdrawalSettings } from '../database';

@Injectable()
export class WithdrawalSettingsService {
  async get() {
    const existing = await db.query.withdrawalSettings.findFirst({
      where: eq(withdrawalSettings.id, 1),
    });

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(withdrawalSettings)
      .values({ id: 1 })
      .onConflictDoNothing({ target: withdrawalSettings.id })
      .returning();

    return (
      created ??
      (await db.query.withdrawalSettings.findFirst({
        where: eq(withdrawalSettings.id, 1),
      }))!
    );
  }

  async update(params: {
    referralMinimumWithdrawal?: string;
    taskWithdrawalDay?: number;
    autoPayoutEnabled?: boolean;
    withdrawalFeeFlat?: string;
    withdrawalFeePercent?: string;
  }) {
    await this.get();

    if (params.withdrawalFeeFlat !== undefined) {
      const flat = Number(params.withdrawalFeeFlat);
      if (!Number.isFinite(flat) || flat < 0) {
        throw new BadRequestException(
          'Withdrawal flat fee must be a non-negative number',
        );
      }
    }

    if (params.withdrawalFeePercent !== undefined) {
      const percent = Number(params.withdrawalFeePercent);
      if (!Number.isFinite(percent) || percent < 0 || percent >= 100) {
        throw new BadRequestException(
          'Withdrawal fee percent must be between 0 and 100',
        );
      }
    }

    if (params.referralMinimumWithdrawal !== undefined) {
      const amount = Number(params.referralMinimumWithdrawal);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException(
          'Referral minimum withdrawal must be a non-negative number',
        );
      }
    }

    if (params.taskWithdrawalDay !== undefined) {
      if (
        !Number.isInteger(params.taskWithdrawalDay) ||
        params.taskWithdrawalDay < 1 ||
        params.taskWithdrawalDay > 28
      ) {
        throw new BadRequestException(
          'Task withdrawal day must be an integer between 1 and 28',
        );
      }
    }

    const [updated] = await db
      .update(withdrawalSettings)
      .set({
        ...(params.referralMinimumWithdrawal !== undefined && {
          referralMinimumWithdrawal: Number(
            params.referralMinimumWithdrawal,
          ).toFixed(2),
        }),
        ...(params.taskWithdrawalDay !== undefined && {
          taskWithdrawalDay: params.taskWithdrawalDay,
        }),
        ...(params.autoPayoutEnabled !== undefined && {
          autoPayoutEnabled: params.autoPayoutEnabled,
        }),
        ...(params.withdrawalFeeFlat !== undefined && {
          withdrawalFeeFlat: Number(params.withdrawalFeeFlat).toFixed(2),
        }),
        ...(params.withdrawalFeePercent !== undefined && {
          withdrawalFeePercent: Number(params.withdrawalFeePercent).toFixed(2),
        }),
        updatedAt: new Date(),
      })
      .where(eq(withdrawalSettings.id, 1))
      .returning();

    return updated;
  }

  /**
   * The fee a withdrawal of `amount` pays: flat + amount * percent / 100,
   * rounded to kobo. Deducted from the amount, so the user receives
   * `amount - fee` in their bank account.
   */
  static calculateFee(
    amount: number,
    settings: { withdrawalFeeFlat: string; withdrawalFeePercent: string },
  ): number {
    const fee =
      Number(settings.withdrawalFeeFlat) +
      (amount * Number(settings.withdrawalFeePercent)) / 100;
    return Math.round(fee * 100) / 100;
  }
}
