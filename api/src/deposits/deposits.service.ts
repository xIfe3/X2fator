import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';

import { db } from '../database';
import { deposits, payments, users } from '../database';
import { WalletService } from '../wallet/wallet.service';
import { MAILER, type Mailer } from '../mail/mailer.service';

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    @Optional() private readonly walletService?: WalletService,
    @Optional() @Inject(MAILER) private readonly mailer?: Mailer,
  ) {}

  async createDeposit(userId: string, amount: string, provider: 'flutterwave') {
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

      const depositUser = await tx.query.users.findFirst({
        where: eq(users.id, deposit.userId),
      });
      if (depositUser) {
        this.mailer
          ?.sendDepositSuccessful(
            depositUser.email,
            depositUser.firstName,
            deposit.amount.toFixed(2),
          )
          .catch((err) =>
            this.logger.error(
              `Failed to send deposit-successful email to ${depositUser.email}`,
              err instanceof Error ? err.stack : err,
            ),
          );
      }

      return updatedDeposit;
    });
  }

  async getAllDeposits() {
    const rows = await db
      .select({
        deposit: deposits,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(deposits)
      .innerJoin(users, eq(deposits.userId, users.id))
      .orderBy(desc(deposits.createdAt));

    return rows.map((r) => ({
      ...r.deposit,
      userFirstName: r.userFirstName,
      userLastName: r.userLastName,
      userEmail: r.userEmail,
    }));
  }

  /**
   * Admin: a single deposit with its user and linked payment record
   * (including the raw provider response) attached — the full detail
   * view behind the admin deposits list.
   */
  async getOneAdmin(depositId: string) {
    const row = await db
      .select({
        deposit: deposits,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(deposits)
      .innerJoin(users, eq(deposits.userId, users.id))
      .where(eq(deposits.id, depositId))
      .limit(1);

    if (!row[0]) {
      throw new NotFoundException('Deposit not found');
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.depositId, depositId),
    });

    return {
      ...row[0].deposit,
      userId: row[0].userId,
      userFirstName: row[0].userFirstName,
      userLastName: row[0].userLastName,
      userEmail: row[0].userEmail,
      payment: payment
        ? {
            id: payment.id,
            reference: payment.reference,
            providerReference: payment.providerReference,
            status: payment.status,
            rawResponse: payment.rawResponse,
          }
        : null,
    };
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

  async failDeposit(
    depositId: string,
    reason?: string,
    options?: { skipEmail?: boolean },
  ) {
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

    if (!options?.skipEmail) {
      const depositUser = await db.query.users.findFirst({
        where: eq(users.id, deposit.userId),
      });
      if (depositUser) {
        this.mailer
          ?.sendDepositFailed(
            depositUser.email,
            depositUser.firstName,
            deposit.amount.toFixed(2),
            reason,
          )
          .catch((err) =>
            this.logger.error(
              `Failed to send deposit-failed email to ${depositUser.email}`,
              err instanceof Error ? err.stack : err,
            ),
          );
      }
    }

    return updated;
  }

  private generateReference(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
