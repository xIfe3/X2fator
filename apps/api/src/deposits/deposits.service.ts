import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@2xfactor/database';
import { deposits, payments } from '@2xfactor/database';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class DepositsService {
  constructor(@Optional() private readonly walletService?: WalletService) {}

  async createDeposit(
    userId: string,
    amount: string,
    provider: 'flutterwave' | 'manual' | 'mock',
  ) {
    if (Number(amount) <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    const reference = this.generateReference('DEP');

    const [deposit] = await db
      .insert(deposits)
      .values({
        userId,
        amount: Number(amount),
        currency: 'NGN',
        provider,
        reference,
        status: 'pending',
      })
      .returning();

    const paymentReference = this.generateReference('PAY');

    await db.insert(payments).values({
      userId,
      depositId: deposit.id,
      provider,
      reference: paymentReference,
      amount,
      status: 'pending',
    });

    if (provider === 'mock') {
      // Sandbox provider — there's no real payment to wait on, so
      // complete it immediately and credit the wallet right away.
      const completedDeposit = await this.completeDeposit(deposit.id, 'MOCK');
      return { deposit: completedDeposit, paymentReference };
    }

    return {
      deposit,
      paymentReference,
    };
  }

  async getUserDeposits(userId: string) {
    return db.query.deposits.findMany({
      where: eq(deposits.userId, userId),
      orderBy: [desc(deposits.createdAt)],
    });
  }

  async getDeposit(userId: string, depositId: string) {
    const deposit = await db.query.deposits.findFirst({
      where: eq(deposits.id, depositId),
    });

    if (!deposit || deposit.userId !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    return deposit;
  }

  /**
   * Marks a deposit as successful and credits
   * the user's account wallet.
   *
   * This method will eventually be called by the
   * payment provider webhook.
   */
  async completeDeposit(depositId: string, providerReference?: string) {
    return db.transaction(async (tx) => {
      const deposit = await tx.query.deposits.findFirst({
        where: eq(deposits.id, depositId),
      });

      if (!deposit) {
        throw new NotFoundException('Deposit not found');
      }

      if (deposit.status === 'successful') {
        return deposit;
      }

      if (deposit.status === 'failed' || deposit.status === 'rejected') {
        throw new BadRequestException('Deposit cannot be completed');
      }

      const [updatedDeposit] = await tx
        .update(deposits)
        .set({
          status: 'successful',
          providerReference,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, depositId))
        .returning();

      await tx
        .update(payments)
        .set({
          status: 'successful',
          providerReference,
          updatedAt: new Date(),
        })
        .where(eq(payments.depositId, depositId));

      await this.walletService!.credit(
        {
          userId: deposit.userId,
          walletType: 'account',
          amount: deposit.amount.toFixed(2),
          type: 'deposit',
          reference: `DEP_${deposit.reference}`,
          description: 'Wallet deposit',
          metadata: { depositId: deposit.id, providerReference },
        },
        tx,
      );

      return updatedDeposit;
    });
  }

  async getAllDeposits() {
    return db.query.deposits.findMany({
      orderBy: [desc(deposits.createdAt)],
    });
  }

  async getAdminStats() {
    const [stats] = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${deposits.amount}), 0)::text`,
        successfulCount: sql<number>`count(*) filter (where ${deposits.status} = 'successful')::int`,
        successfulAmount: sql<string>`coalesce(sum(${deposits.amount}) filter (where ${deposits.status} = 'successful'), 0)::text`,
        pendingCount: sql<number>`count(*) filter (where ${deposits.status} in ('pending', 'processing'))::int`,
        pendingAmount: sql<string>`coalesce(sum(${deposits.amount}) filter (where ${deposits.status} in ('pending', 'processing')), 0)::text`,
        failedCount: sql<number>`count(*) filter (where ${deposits.status} in ('failed', 'rejected'))::int`,
        failedAmount: sql<string>`coalesce(sum(${deposits.amount}) filter (where ${deposits.status} in ('failed', 'rejected')), 0)::text`,
      })
      .from(deposits);

    return stats;
  }

  async reviewDeposit(
    depositId: string,
    action: 'approve' | 'reject',
    providerReference?: string,
    reason?: string,
  ) {
    if (action === 'approve') {
      return this.completeDeposit(depositId, providerReference);
    }

    return this.failDeposit(depositId, reason);
  }

  async failDeposit(depositId: string, reason?: string) {
    const deposit = await db.query.deposits.findFirst({
      where: eq(deposits.id, depositId),
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status === 'successful') {
      throw new BadRequestException('Successful deposit cannot be failed');
    }

    const [updated] = await db
      .update(deposits)
      .set({
        status: 'failed',
        failureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(deposits.id, depositId))
      .returning();

    return updated;
  }

  private generateReference(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
