import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { desc, eq, sql } from 'drizzle-orm';

import { db, users, withdrawals, type Withdrawal } from '../../database';

import { AuditService } from '../../audit/audit.service';
import { MAILER, type Mailer } from '../../mail/mailer.service';

@Injectable()
export class AdminWithdrawalsService {
  private readonly logger = new Logger(AdminWithdrawalsService.name);

  constructor(
    private readonly auditService: AuditService,
    @Optional() @Inject(MAILER) private readonly mailer?: Mailer,
  ) {}

  async getPendingWithdrawals() {
    return db.query.withdrawals.findMany({
      where: eq(withdrawals.status, 'pending'),
      orderBy: [desc(withdrawals.createdAt)],
    });
  }

  /**
   * Admin: every withdrawal regardless of status — the manual review
   * queue (getPendingWithdrawals) only ever shows `pending` requests, so
   * this is the only place an admin can see `processing` (auto-payout in
   * flight), `completed`, or `rejected` withdrawals.
   */
  async getAllWithdrawals(status?: Withdrawal['status']) {
    return db.query.withdrawals.findMany({
      where: status ? eq(withdrawals.status, status) : undefined,
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

    const withdrawingUser = await db.query.users.findFirst({
      where: eq(users.id, withdrawal.userId),
    });
    if (withdrawingUser) {
      this.mailer
        ?.sendWithdrawalRejected(
          withdrawingUser.email,
          withdrawingUser.firstName,
          withdrawal.amount,
          note,
        )
        .catch((err) =>
          this.logger.error(
            `Failed to send withdrawal-rejected email to ${withdrawingUser.email}`,
            err instanceof Error ? err.stack : err,
          ),
        );
    }

    return updatedWithdrawal;
  }
}
