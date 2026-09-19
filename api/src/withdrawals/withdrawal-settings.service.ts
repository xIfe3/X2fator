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
  }) {
    await this.get();

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
        updatedAt: new Date(),
      })
      .where(eq(withdrawalSettings.id, 1))
      .returning();

    return updated;
  }
}
