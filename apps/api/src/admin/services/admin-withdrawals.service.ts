import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { desc, eq } from 'drizzle-orm';

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
