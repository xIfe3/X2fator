import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { db } from '@2xfactor/database';
import { deposits, payments } from '@2xfactor/database';

import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Initialize a payment.
   *
   * Actual Paystack/Flutterwave API integration
   * will be added behind this method.
   */
  async initializePayment(userId: string, depositId: string) {
    const deposit = await db.query.deposits.findFirst({
      where: eq(deposits.id, depositId),
    });

    if (!deposit || deposit.userId !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'pending') {
      throw new BadRequestException('Deposit is no longer pending');
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.depositId, deposit.id),
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    /**
     * Provider integration goes here.
     *
     * For now we return the payment information.
     */
    return {
      paymentId: payment.id,
      reference: payment.reference,
      provider: payment.provider,
      amount: payment.amount,
      currency: deposit.currency,
      status: payment.status,
    };
  }

  /**
   * Get payment by reference.
   */
  async getPaymentByReference(reference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Mark payment successful and credit wallet.
   *
   * This will be called after provider verification.
   */
  async completePayment(reference: string, providerReference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'successful') {
      return payment;
    }

    if (!payment.depositId) {
      throw new BadRequestException('Payment is not linked to a deposit');
    }

    const deposit = await db.query.deposits.findFirst({
      where: eq(deposits.id, payment.depositId),
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status === 'successful') {
      return payment;
    }

    const [updatedPayment] = await db
      .update(payments)
      .set({
        status: 'successful',
        providerReference,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    /**
     * Credit the account wallet.
     */
    await this.walletService.credit({
      userId: payment.userId,
      walletType: 'account',
      amount: payment.amount,
      type: 'deposit',
      reference: `DEP_${payment.reference}`,
      description: 'Wallet deposit',
      metadata: {
        paymentReference: payment.reference,
        providerReference,
      },
    });

    await db
      .update(deposits)
      .set({
        status: 'successful',
        providerReference,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deposits.id, deposit.id));

    return updatedPayment;
  }

  async failPayment(reference: string, reason?: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'successful') {
      throw new BadRequestException('Successful payment cannot be failed');
    }

    const [updatedPayment] = await db
      .update(payments)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    if (payment.depositId) {
      await db
        .update(deposits)
        .set({
          status: 'failed',
          failureReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, payment.depositId));
    }

    return updatedPayment;
  }
}
