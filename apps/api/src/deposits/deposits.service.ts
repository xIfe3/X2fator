import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { db } from '@2xfactor/database';
import { deposits, payments } from '@2xfactor/database';

@Injectable()
export class DepositsService {
  constructor() {}

  async createDeposit(
    userId: string,
    amount: string,
    provider: 'paystack' | 'flutterwave' | 'manual' | 'mock',
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

      /**
       * Wallet credit is handled separately through
       * WalletService when we wire provider webhooks.
       */

      return updatedDeposit;
    });
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
