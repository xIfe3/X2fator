import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import {
  db,
  utilityPurchases,
  walletTransactions,
  wallets,
} from '../database';
import { FlutterwaveBillsService } from './flutterwave-bills.service';

@Injectable()
export class UtilitiesService {
  private readonly logger = new Logger(UtilitiesService.name);

  constructor(
    private readonly flutterwaveBillsService: FlutterwaveBillsService,
  ) {}

  async listDataBundles(provider: 'mtn' | 'airtel' | 'glo' | '9mobile') {
    return this.flutterwaveBillsService.listDataBundles(provider);
  }

  /**
   * Create and process a utility purchase.
   *
   * The wallet is debited first, then Flutterwave's Bills API is
   * called to actually deliver the airtime/data. On success the
   * purchase is marked successful; on failure the wallet is refunded.
   */
  async purchase(
    userId: string,
    params: {
      type: 'airtime' | 'data';
      provider: 'mtn' | 'airtel' | 'glo' | '9mobile';
      phoneNumber: string;
      amount: string;
      productCode?: string;
    },
  ) {
    const amount = Number(params.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (params.type === 'data' && !params.productCode) {
      throw new BadRequestException(
        'Product code is required for data purchases',
      );
    }

    const purchase = await db.transaction(async (tx) => {
      const wallet = await tx.query.wallets.findFirst({
        where: and(eq(wallets.userId, userId), eq(wallets.type, 'account')),
      });

      if (!wallet) {
        throw new NotFoundException('Account wallet not found');
      }

      if (wallet.status !== 'active') {
        throw new BadRequestException('Wallet is not active');
      }

      const balanceBefore = Number(wallet.balance);

      if (balanceBefore < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceAfter = balanceBefore - amount;
      const reference = this.generateReference('UTIL');

      const [created] = await tx
        .insert(utilityPurchases)
        .values({
          userId,
          type: params.type,
          provider: params.provider,
          phoneNumber: params.phoneNumber,
          amount: amount.toFixed(2),
          reference,
          productCode: params.productCode,
          status: 'pending',
          metadata: {
            initiatedAt: new Date().toISOString(),
          },
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
        type: params.type === 'airtime' ? 'airtime_purchase' : 'data_purchase',
        direction: 'debit',
        amount: amount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        reference,
        description:
          params.type === 'airtime' ? 'Airtime purchase' : 'Data purchase',
        metadata: {
          utilityPurchaseId: created.id,
          provider: params.provider,
          phoneNumber: params.phoneNumber,
          productCode: params.productCode,
        },
        status: 'completed',
      });

      return created;
    });

    await this.markProcessing(purchase.id);

    try {
      const result =
        params.type === 'airtime'
          ? await this.flutterwaveBillsService.payAirtime({
              provider: params.provider,
              phoneNumber: params.phoneNumber,
              amount: params.amount,
              reference: purchase.reference,
            })
          : await this.flutterwaveBillsService.payDataBundle({
              provider: params.provider,
              phoneNumber: params.phoneNumber,
              amount: params.amount,
              itemCode: params.productCode!,
              reference: purchase.reference,
            });

      return this.markSuccessful(purchase.id, result.providerReference, result.message);
    } catch (err) {
      this.logger.error(
        `Utility purchase ${purchase.reference} failed`,
        err instanceof Error ? err.stack : err,
      );
      return this.markFailed(
        purchase.id,
        err instanceof BadRequestException
          ? (err.getResponse() as { message?: string })?.message ??
              'Bill payment failed'
          : 'Bill payment failed',
      );
    }
  }

  /**
   * Get a user's utility purchase history.
   */
  async getMyPurchases(userId: string) {
    return db.query.utilityPurchases.findMany({
      where: eq(utilityPurchases.userId, userId),
      orderBy: [desc(utilityPurchases.createdAt)],
    });
  }

  /**
   * Get one utility purchase belonging to the user.
   */
  async getMyPurchase(userId: string, purchaseId: string) {
    const purchase = await db.query.utilityPurchases.findFirst({
      where: and(
        eq(utilityPurchases.id, purchaseId),
        eq(utilityPurchases.userId, userId),
      ),
    });

    if (!purchase) {
      throw new NotFoundException('Utility purchase not found');
    }

    return purchase;
  }

  /**
   * Get a purchase by its reference.
   */
  async getByReference(userId: string, reference: string) {
    const purchase = await db.query.utilityPurchases.findFirst({
      where: and(
        eq(utilityPurchases.reference, reference),
        eq(utilityPurchases.userId, userId),
      ),
    });

    if (!purchase) {
      throw new NotFoundException('Utility purchase not found');
    }

    return purchase;
  }

  /**
   * Handle a successful provider response.
   */
  async markSuccessful(
    purchaseId: string,
    providerReference: string,
    responseMessage?: string,
    metadata?: Record<string, unknown>,
  ) {
    const [purchase] = await db
      .update(utilityPurchases)
      .set({
        status: 'successful',
        providerReference,
        responseMessage,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(utilityPurchases.id, purchaseId))
      .returning();

    if (!purchase) {
      throw new NotFoundException('Utility purchase not found');
    }

    return purchase;
  }

  /**
   * Handle a failed provider response.
   *
   * The wallet is refunded because the purchase was not completed.
   */
  async markFailed(purchaseId: string, responseMessage: string) {
    return db.transaction(async (tx) => {
      const purchase = await tx.query.utilityPurchases.findFirst({
        where: eq(utilityPurchases.id, purchaseId),
      });

      if (!purchase) {
        throw new NotFoundException('Utility purchase not found');
      }

      if (purchase.status !== 'pending' && purchase.status !== 'processing') {
        throw new BadRequestException(
          'Purchase cannot be failed in its current state',
        );
      }

      const wallet = await tx.query.wallets.findFirst({
        where: and(
          eq(wallets.userId, purchase.userId),
          eq(wallets.type, 'account'),
        ),
      });

      if (!wallet) {
        throw new NotFoundException('Account wallet not found');
      }

      const balanceBefore = Number(wallet.balance);
      const amount = Number(purchase.amount);
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
        reference: this.generateReference('UREF'),
        description: 'Utility purchase refund',
        metadata: {
          utilityPurchaseId: purchase.id,
          originalReference: purchase.reference,
        },
        status: 'completed',
      });

      const [updatedPurchase] = await tx
        .update(utilityPurchases)
        .set({
          status: 'failed',
          responseMessage,
          updatedAt: new Date(),
        })
        .where(eq(utilityPurchases.id, purchaseId))
        .returning();

      return updatedPurchase;
    });
  }

  /**
   * Mark a purchase as processing.
   */
  async markProcessing(purchaseId: string) {
    const [purchase] = await db
      .update(utilityPurchases)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(utilityPurchases.id, purchaseId))
      .returning();

    if (!purchase) {
      throw new NotFoundException('Utility purchase not found');
    }

    return purchase;
  }

  private generateReference(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }
}
