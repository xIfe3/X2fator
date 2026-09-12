import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { desc, eq, sql } from 'drizzle-orm';

import { db, withdrawals } from '@2xfactor/database';

import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AdminWithdrawalsService {
  constructor(private readonly auditService: AuditService) {}

  async getPendingWithdrawals() {
    return db.query.withdrawals.findMany({
      where: eq(withdrawals.status, 'pending'),
      orderBy: [desc(withdrawals.createdAt)],
    });
  }

  async getAdminStats() {
    const [stats] = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${withdrawals.amount}), 0)::text`,
        pendingCount: sql<number>`count(*) filter (where ${withdrawals.status} in ('pending', 'processing'))::int`,
        pendingAmount: sql<string>`coalesce(sum(${withdrawals.amount}) filter (where ${withdrawals.status} in ('pending', 'processing')), 0)::text`,
        completedCount: sql<number>`count(*) filter (where ${withdrawals.status} = 'completed')::int`,
        completedAmount: sql<string>`coalesce(sum(${withdrawals.amount}) filter (where ${withdrawals.status} = 'completed'), 0)::text`,
        rejectedCount: sql<number>`count(*) filter (where ${withdrawals.status} in ('rejected', 'cancelled'))::int`,
        rejectedAmount: sql<string>`coalesce(sum(${withdrawals.amount}) filter (where ${withdrawals.status} in ('rejected', 'cancelled')), 0)::text`,
      })
      .from(withdrawals);

    return stats;
  }

  async getWithdrawal(withdrawalId: string) {
    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawalId),
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

  async rejectWithdrawal(adminId: string, withdrawalId: string, note?: string) {
    const withdrawal = await this.getWithdrawal(withdrawalId);

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      throw new BadRequestException(
        'Withdrawal cannot be rejected in its current state',
      );
    }

    const [updatedWithdrawal] = await db
      .update(withdrawals)
      .set({
        status: 'rejected',
        rejectionReason: note,
        processedBy: adminId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'reject',
      entityType: 'withdrawal',
      entityId: withdrawalId,
      description: 'Rejected withdrawal',
      oldValues: {
        status: withdrawal.status,
      },
      newValues: {
        status: 'rejected',
        rejectionReason: note,
      },
    });

    return updatedWithdrawal;
  }
}
