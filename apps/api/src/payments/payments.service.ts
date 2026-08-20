import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';

import { db } from '@2xfactor/database';
import { deposits, payments, users } from '@2xfactor/database';

import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class PaymentsService {
  constructor(
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

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

    if (payment.provider === 'paystack') {
      const secretKey = this.configService?.get<string>('paystack.secretKey');
      if (!secretKey) {
        throw new BadRequestException('Paystack is not configured');
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) throw new NotFoundException('User not found');

      const response = await fetch(
        'https://api.paystack.co/transaction/initialize',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            amount: Math.round(Number(payment.amount) * 100),
            reference: payment.reference,
            currency: deposit.currency,
            callback_url: this.configService?.get<string>(
              'paystack.callbackUrl',
            ),
          }),
        },
      );

      const body = (await response.json()) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url?: string; access_code?: string };
      };

      if (!response.ok || !body.status || !body.data?.authorization_url) {
        throw new BadRequestException(
          body.message ?? 'Paystack initialization failed',
        );
      }

      return {
        paymentId: payment.id,
        reference: payment.reference,
        provider: payment.provider,
        amount: payment.amount,
        currency: deposit.currency,
        status: payment.status,
        authorizationUrl: body.data.authorization_url,
        accessCode: body.data.access_code,
      };
    }

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

  async verifyPaystackPayment(userId: string, reference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.provider !== 'paystack') {
      throw new BadRequestException('Payment is not a Paystack payment');
    }
    if (payment.status === 'successful') return payment;

    const secretKey = this.configService?.get<string>('paystack.secretKey');
    if (!secretKey) throw new BadRequestException('Paystack is not configured');

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const body = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { status?: string; reference?: string };
    };

    if (!response.ok || !body.status || body.data?.status !== 'success') {
      throw new BadRequestException(
        body.message ?? 'Paystack payment is not successful',
      );
    }

    return this.completePayment(reference, body.data.reference ?? reference);
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
    await this.walletService!.credit({
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
