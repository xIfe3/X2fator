import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import {
  db,
  wallets,
  walletTransactions,
  type Wallet,
} from '@2xfactor/database';

@Injectable()
export class WalletService {
  /**
   * Get or create a user's wallet.
   */
  async ensureWallet(
    userId: string,
    type: 'account' | 'task' | 'referral',
  ): Promise<Wallet> {
    const existing = await db.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.type, type)),
    });

    if (existing) {
      return existing;
    }

    const [wallet] = await db
      .insert(wallets)
      .values({
        userId,
        type,
        balance: '0',
        status: 'active',
      })
      .returning();

    return wallet;
  }

  /**
   * Get a user's wallet.
   */
  async getWallet(
    userId: string,
    type: 'account' | 'task' | 'referral',
  ): Promise<Wallet> {
    const wallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.type, type)),
    });

    if (!wallet) {
      throw new NotFoundException(`${type} wallet not found`);
    }

    return wallet;
  }

  /**
   * Get the three wallets used by the product.
   */
  async getUserWallets(userId: string) {
    const accountWallet = await this.ensureWallet(userId, 'account');

    const taskWallet = await this.ensureWallet(userId, 'task');
    const referralWallet = await this.ensureWallet(userId, 'referral');

    return {
      account: accountWallet,
      task: taskWallet,
      referral: referralWallet,
    };
  }

  /**
   * Credit a wallet.
   *
   * If a transaction is provided, the operation runs inside
   * that existing transaction.
   */
  async credit(
    params: {
      userId: string;
      walletType: 'account' | 'task' | 'referral';
      amount: string;
      type:
        | 'deposit'
        | 'task_reward'
        | 'referral_commission'
        | 'refund'
        | 'adjustment';
      reference: string;
      description?: string;
      metadata?: Record<string, unknown>;
    },
    tx?: DbTransaction,
  ) {
    if (Number(params.amount) <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const execute = async (trx: DbTransaction) => {
      const wallet = await trx.query.wallets.findFirst({
        where: and(
          eq(wallets.userId, params.userId),
          eq(wallets.type, params.walletType),
        ),
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.status !== 'active') {
        throw new BadRequestException('Wallet is not active');
      }

      const balanceBefore = Number(wallet.balance);
      const amount = Number(params.amount);
      const balanceAfter = balanceBefore + amount;

      const [updatedWallet] = await trx
        .update(wallets)
        .set({
          balance: balanceAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id))
        .returning();

      await trx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: params.type,
        direction: 'credit',
        amount: amount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        reference: params.reference,
        description: params.description,
        metadata: params.metadata,
        status: 'completed',
      });

      return updatedWallet;
    };

    if (tx) {
      return execute(tx);
    }

    return db.transaction(execute);
  }

  /**
   * Debit a wallet.
   *
   * If a transaction is provided, the operation runs inside
   * that existing transaction.
   */
  async debit(
    params: {
      userId: string;
      walletType: 'account' | 'task' | 'referral';
      amount: string;
      type:
        | 'plan_purchase'
        | 'withdrawal'
        | 'airtime_purchase'
        | 'data_purchase'
        | 'fee';
      reference: string;
      description?: string;
      metadata?: Record<string, unknown>;
    },
    tx?: DbTransaction,
  ) {
    if (Number(params.amount) <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const execute = async (trx: DbTransaction) => {
      const wallet = await trx.query.wallets.findFirst({
        where: and(
          eq(wallets.userId, params.userId),
          eq(wallets.type, params.walletType),
        ),
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.status !== 'active') {
        throw new BadRequestException('Wallet is not active');
      }

      const balanceBefore = Number(wallet.balance);
      const amount = Number(params.amount);

      if (balanceBefore < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceAfter = balanceBefore - amount;

      const [updatedWallet] = await trx
        .update(wallets)
        .set({
          balance: balanceAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id))
        .returning();

      await trx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: params.type,
        direction: 'debit',
        amount: amount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        reference: params.reference,
        description: params.description,
        metadata: params.metadata,
        status: 'completed',
      });

      return updatedWallet;
    };

    if (tx) {
      return execute(tx);
    }

    return db.transaction(execute);
  }

  /**
   * Get wallet transactions.
   */
  async getTransactions(
    userId: string,
    walletType: 'account' | 'task' | 'referral',
  ) {
    const wallet = await this.getWallet(userId, walletType);

    return db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, wallet.id),
      orderBy: [desc(walletTransactions.createdAt)],
    });
  }
}

/**
 * Drizzle transaction type.
 */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
