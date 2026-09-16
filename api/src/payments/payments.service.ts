import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';

import { db } from '../database';
import { deposits, payments, users } from '../database';

import { WalletService } from '../wallet/wallet.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PaymentsService {
  constructor(
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  /**
   * Initialize a payment.
   *
   * Provider integrations stay behind this method so the rest of the app only
   * deals with deposits and payment records.
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

    if (payment.provider === 'flutterwave') {
      const authorizationUrl = await this.initializeFlutterwaveCheckout(
        userId,
        payment.reference,
        payment.amount,
        deposit.currency,
        'X2Factor wallet deposit',
      );

      return {
        paymentId: payment.id,
        reference: payment.reference,
        provider: payment.provider,
        amount: payment.amount,
        currency: deposit.currency,
        status: payment.status,
        authorizationUrl,
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
   * Initialize a Flutterwave checkout for a payment that isn't tied to a
   * deposit — currently used for the signup-time plan purchase, where the
   * money is paying for a plan directly rather than topping up a wallet.
   */
  async initializeRawPayment(userId: string, paymentReference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, paymentReference),
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException('Payment is no longer pending');
    }

    const authorizationUrl = await this.initializeFlutterwaveCheckout(
      userId,
      payment.reference,
      payment.amount,
      'NGN',
      'X2Factor plan purchase',
    );

    return {
      paymentId: payment.id,
      reference: payment.reference,
      amount: payment.amount,
      authorizationUrl,
    };
  }

  private async initializeFlutterwaveCheckout(
    userId: string,
    reference: string,
    amount: string,
    currency: string,
    title: string,
  ): Promise<string> {
    const secretKey = this.configService?.get<string>('flutterwave.secretKey');
    const baseUrl = this.configService?.get<string>('flutterwave.baseUrl');
    const callbackUrl = this.configService?.get<string>(
      'flutterwave.callbackUrl',
    );

    if (!secretKey || !baseUrl || !callbackUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundException('User not found');

    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: Number(amount),
        currency,
        redirect_url: callbackUrl,
        customer: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        customizations: {
          title,
        },
      }),
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };

    if (!response.ok || body.status !== 'success' || !body.data?.link) {
      throw new BadRequestException(
        body.message ?? 'Flutterwave initialization failed',
      );
    }

    return body.data.link;
  }

  /**
   * Get payment by reference.
   */
  async getPaymentByReference(userId: string, reference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getUserPayments(userId: string) {
    return db.query.payments.findMany({
      where: eq(payments.userId, userId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }

  async verifyPayment(userId: string, reference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === 'successful') return payment;

    if (payment.provider !== 'flutterwave') {
      throw new BadRequestException(
        'This payment provider has no verification adapter',
      );
    }

    return this.verifyFlutterwavePayment(payment.reference);
  }

  /**
   * Verifies a Flutterwave payment by reference with no ownership check —
   * used by the signup flow where the caller isn't authenticated yet.
   * Safe because a payment reference is an unguessable, single-use token.
   */
  async verifyFlutterwavePaymentPublic(reference: string) {
    return this.verifyFlutterwavePayment(reference);
  }

  private async verifyFlutterwavePayment(reference: string) {
    const secretKey = this.configService?.get<string>(
      'flutterwave.secretKey',
    );
    const baseUrl = this.configService?.get<string>('flutterwave.baseUrl');

    if (!secretKey || !baseUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }

    const response = await fetch(
      `${baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { status?: string; tx_ref?: string; amount?: number; currency?: string };
    };

    if (!response.ok || body.status !== 'success' || body.data?.status !== 'successful') {
      throw new BadRequestException(
        body.message ?? 'Flutterwave payment is not successful',
      );
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (
      body.data.amount !== undefined &&
      Number(body.data.amount) < Number(payment.amount)
    ) {
      throw new BadRequestException(
        'Flutterwave payment amount does not match expected amount',
      );
    }

    return this.completePayment(reference, body.data.tx_ref ?? reference);
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

    const metadata = payment.metadata as
      | { purpose?: string; planId?: string }
      | null;

    if (metadata?.purpose === 'plan_purchase' && metadata.planId) {
      return this.activatePlanPurchase(
        payment.userId,
        metadata.planId,
        reference,
        providerReference,
      );
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

  /**
   * Activates a signup-time plan purchase: marks the payment successful,
   * credits the account wallet for the plan price then immediately debits
   * it via the normal purchasePlan() flow (keeps one consistent wallet
   * transaction trail — a deposit line followed by a plan-purchase line,
   * same as if the user had funded their wallet and bought the plan
   * separately), and activates the account. Idempotent: calling it again
   * for an already-successful payment is a no-op.
   */
  async activatePlanPurchase(
    userId: string,
    planId: string,
    reference: string,
    providerReference?: string,
  ) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'successful') {
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

    await this.walletService!.credit({
      userId,
      walletType: 'account',
      amount: payment.amount,
      type: 'deposit',
      reference: `DEP_${payment.reference}`,
      description: 'Plan purchase payment',
      metadata: { paymentReference: payment.reference, providerReference },
    });

    await this.subscriptionsService!.purchasePlan(userId, planId);

    await db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, userId));

    return updatedPayment;
  }

  /**
   * Verifies the `verif-hash` header Flutterwave sends with every webhook
   * call against our configured secret hash, then completes the payment.
   * Amount/status are always re-checked server-side against Flutterwave's
   * API rather than trusted from the webhook body directly.
   */
  async handleFlutterwaveWebhook(signature: string | undefined, body: {
    data?: { tx_ref?: string; status?: string };
  }) {
    const secretHash = this.configService?.get<string>(
      'flutterwave.secretHash',
    );

    if (!secretHash || !signature || signature !== secretHash) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const txRef = body.data?.tx_ref;
    if (!txRef || body.data?.status !== 'successful') {
      return { received: true };
    }

    await this.verifyFlutterwavePayment(txRef);
    return { received: true };
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
