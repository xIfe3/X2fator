import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import {
  db,
  walletTransactions,
  wallets,
  withdrawals,
} from '@2xfactor/database';

@Injectable()
export class WithdrawalsService {
  /**
   * Create a withdrawal request.
   *
   * Funds are deducted immediately from the earnings wallet.
   * If the withdrawal is later rejected/cancelled,
   * the funds are returned to the wallet.
   */
  async createWithdrawal(
    userId: string,
    params: {
      amount: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    },
  ) {
    const amount = Number(params.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const fee = 0;
    const netAmount = amount - fee;

    return db.transaction(async (tx) => {
      const wallet = await tx.query.wallets.findFirst({
        where: and(eq(wallets.userId, userId), eq(wallets.type, 'earnings')),
      });

      if (!wallet) {
        throw new NotFoundException('Earnings wallet not found');
      }

      if (wallet.status !== 'active') {
        throw new BadRequestException('Wallet is not active');
      }

      const balanceBefore = Number(wallet.balance);

      if (balanceBefore < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceAfter = balanceBefore - amount;

      const transactionReference = this.generateReference('WD');

      const [withdrawal] = await tx
        .insert(withdrawals)
        .values({
          userId,
          amount: amount.toFixed(2),
          fee: fee.toFixed(2),
          netAmount: netAmount.toFixed(2),
          bankName: params.bankName,
          accountNumber: params.accountNumber,
          accountName: params.accountName,
          transactionReference,
          status: 'pending',
        })
        .returning();

      await tx
        .update(wallets)
        .set({
          balance: balanceAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'withdrawal',
        direction: 'debit',
        amount: amount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        reference: transactionReference,
        description: 'Withdrawal request',
        metadata: {
          withdrawalId: withdrawal.id,
          fee: fee.toFixed(2),
          netAmount: netAmount.toFixed(2),
        },
        status: 'completed',
      });

      return withdrawal;
    });
  }

  /**
   * Get the authenticated user's withdrawals.
   */
  async getMyWithdrawals(userId: string) {
    return db.query.withdrawals.findMany({
      where: eq(withdrawals.userId, userId),
      orderBy: [desc(withdrawals.createdAt)],
    });
  }

  /**
   * Get one withdrawal belonging to the authenticated user.
   */
  async getMyWithdrawal(userId: string, withdrawalId: string) {
    const withdrawal = await db.query.withdrawals.findFirst({
      where: and(
        eq(withdrawals.id, withdrawalId),
        eq(withdrawals.userId, userId),
      ),
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

  /**
   * Admin: get all withdrawals.
   */
  async getAllWithdrawals() {
    return db.query.withdrawals.findMany({
      orderBy: [desc(withdrawals.createdAt)],
    });
  }

  /**
   * Admin: review a withdrawal.
   */
  async reviewWithdrawal(
    withdrawalId: string,
    adminId: string,
    params: {
      status: 'processing' | 'completed' | 'rejected' | 'cancelled';
      rejectionReason?: string;
      adminNote?: string;
    },
  ) {
    return db.transaction(async (tx) => {
      const withdrawal = await tx.query.withdrawals.findFirst({
        where: eq(withdrawals.id, withdrawalId),
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal not found');
      }

      if (
        withdrawal.status === 'completed' ||
        withdrawal.status === 'rejected' ||
        withdrawal.status === 'cancelled'
      ) {
        throw new BadRequestException('Withdrawal has already been finalized');
      }

      if (params.status === 'rejected' && !params.rejectionReason) {
        throw new BadRequestException('Rejection reason is required');
      }

      /*
       * If the withdrawal is rejected/cancelled,
       * return the deducted amount to the earnings wallet.
       */
      if (params.status === 'rejected' || params.status === 'cancelled') {
        const wallet = await tx.query.wallets.findFirst({
          where: and(
            eq(wallets.userId, withdrawal.userId),
            eq(wallets.type, 'earnings'),
          ),
        });

        if (!wallet) {
          throw new NotFoundException('Earnings wallet not found');
        }

        const balanceBefore = Number(wallet.balance);
        const amount = Number(withdrawal.amount);
        const balanceAfter = balanceBefore + amount;

        await tx
          .update(wallets)
          .set({
            balance: balanceAfter.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));

        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: 'refund',
          direction: 'credit',
          amount: amount.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          reference: this.generateReference('WDR'),
          description:
            params.status === 'rejected'
              ? 'Rejected withdrawal refund'
              : 'Cancelled withdrawal refund',
          metadata: {
            withdrawalId: withdrawal.id,
            withdrawalReference: withdrawal.transactionReference,
          },
          status: 'completed',
        });
      }

      const [updatedWithdrawal] = await tx
        .update(withdrawals)
        .set({
          status: params.status,
          rejectionReason:
            params.status === 'rejected' ? params.rejectionReason : null,
          adminNote: params.adminNote,
          processedBy: adminId,
          processedAt: params.status === 'processing' ? null : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId))
        .returning();

      return updatedWithdrawal;
    });
  }

  private generateReference(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
