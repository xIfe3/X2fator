import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@2xfactor/database';
import { earnings } from '@2xfactor/database';

@Injectable()
export class EarningsService {
  async getMyEarnings(userId: string) {
    return db.query.earnings.findMany({
      where: eq(earnings.userId, userId),
      orderBy: [desc(earnings.earningDate)],
    });
  }

  async getMyEarning(userId: string, earningId: string) {
    const earning = await db.query.earnings.findFirst({
      where: and(eq(earnings.id, earningId), eq(earnings.userId, userId)),
    });

    if (!earning) {
      throw new NotFoundException('Earning not found');
    }

    return earning;
  }

  async getEarningsSummary(userId: string) {
    const userEarnings = await db.query.earnings.findMany({
      where: eq(earnings.userId, userId),
    });

    const total = userEarnings.reduce(
      (sum, earning) => sum + Number(earning.amount),
      0,
    );

    const credited = userEarnings
      .filter((earning) => earning.status === 'credited')
      .reduce((sum, earning) => sum + Number(earning.amount), 0);

    const pending = userEarnings
      .filter((earning) => earning.status === 'pending')
      .reduce((sum, earning) => sum + Number(earning.amount), 0);

    const reversed = userEarnings
      .filter((earning) => earning.status === 'reversed')
      .reduce((sum, earning) => sum + Number(earning.amount), 0);

    const cancelled = userEarnings
      .filter((earning) => earning.status === 'cancelled')
      .reduce((sum, earning) => sum + Number(earning.amount), 0);

    return {
      total: total.toFixed(2),
      credited: credited.toFixed(2),
      pending: pending.toFixed(2),
      reversed: reversed.toFixed(2),
      cancelled: cancelled.toFixed(2),
      count: userEarnings.length,
    };
  }

  async getEarningsBySource(
    userId: string,
    source: 'task' | 'referral' | 'bonus' | 'adjustment',
  ) {
    return db.query.earnings.findMany({
      where: and(eq(earnings.userId, userId), eq(earnings.source, source)),
      orderBy: [desc(earnings.earningDate)],
    });
  }
}
