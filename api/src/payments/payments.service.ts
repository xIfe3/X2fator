import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';

import { db } from '../database';
import { deposits, payments, users } from '../database';

import { WalletService } from '../wallet/wallet.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MAILER, type Mailer } from '../mail/mailer.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
    @Optional() @Inject(MAILER) private readonly mailer?: Mailer,
    @Optional() private readonly notificationsService?: NotificationsService,
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
   * Initializes a payment directly against Flutterwave's Charge API
   * (bank transfer or USSD) instead of redirecting to their hosted
   * checkout page. Used by the custom-styled funding screen so the user
   * never leaves our site — we render the returned account number / USSD
   * code ourselves and poll for completion. The same webhook
   * (`charge.completed`) and `verifyPayment` path used by hosted checkout
   * completes these too, since Flutterwave dispatches both the same way.
   */
  async initializeDirectCharge(
    userId: string,
    depositId: string,
    method: 'bank_transfer' | 'ussd',
  ) {
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

    const secretKey = this.configService?.get<string>('flutterwave.secretKey');
    const baseUrl = this.configService?.get<string>('flutterwave.baseUrl');

    if (!secretKey || !baseUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundException('User not found');

    const response = await fetch(`${baseUrl}/charges?type=${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: payment.reference,
        amount: Number(payment.amount),
        currency: deposit.currency,
        email: user.email,
        fullname: `${user.firstName} ${user.lastName}`,
        // "1" auto-selects the first supported USSD bank (GTBank) — we
        // hide the bank choice from the user, so pick one deterministically
        // rather than asking Flutterwave to guess.
        ...(method === 'ussd' ? { account_bank: '058' } : {}),
      }),
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      // The account/USSD details actually come back nested under
      // `meta.authorization` at the top level of the response — there is
      // no `data` object for this endpoint, despite every other
      // Flutterwave v3 endpoint we call using `data`. Also handled below:
      // `data.meta`/`data.meta_data`, in case that shape shows up for
      // other charge variants (kept for resilience, not because we've
      // seen it here).
      meta?: { authorization?: Record<string, unknown> };
      data?: {
        status?: string;
        meta?: Record<string, unknown>;
        meta_data?: Record<string, unknown>;
      };
    };

    // Flutterwave's bank-transfer/USSD charge endpoints respond with HTTP
    // 400 and message "Charge initiated" for the expected "account/code
    // created, now waiting on the customer to pay" case — it's a quirk of
    // this specific endpoint, not an error. Only treat the call as failed
    // when there's no usable charge data at all.
    const chargeInitiated = body.message === 'Charge initiated';

    if (!chargeInitiated && (!response.ok || body.status !== 'success')) {
      throw new BadRequestException(
        body.message ?? 'Could not initialize payment',
      );
    }

    const meta =
      body.meta?.authorization ?? body.data?.meta ?? body.data?.meta_data;

    if (!meta) {
      this.logger.error(
        `Unrecognized Flutterwave charge response shape (${method}): ${JSON.stringify(body)}`,
      );
      throw new BadRequestException(
        body.message ?? 'Could not initialize payment',
      );
    }

    await db
      .update(payments)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    await db
      .update(deposits)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(deposits.id, deposit.id));

    if (method === 'bank_transfer') {
      return {
        method,
        reference: payment.reference,
        amount: payment.amount,
        accountNumber: meta.transfer_account as string | undefined,
        bankName: meta.transfer_bank as string | undefined,
        accountName: meta.transfer_note as string | undefined,
        expiresAt:
          (meta.account_expiration as string | undefined) ??
          (meta.transfer_expiry_date as string | undefined),
      };
    }

    return {
      method,
      reference: payment.reference,
      amount: payment.amount,
      ussdCode:
        (meta.ussd_code as string | undefined) ??
        (meta.note as string | undefined),
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
        // Only bank transfer and USSD — card is left out so users aren't
        // shown a "beneficiary" name mismatch or confused by an option
        // we don't want them using for this flow.
        payment_options: 'banktransfer,ussd',
        customer: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        customizations: {
          // Fixed brand name shown on the checkout page, independent of
          // what this particular payment is for (that detail goes in
          // `description` instead) — keeps "X2Factor" as the name the
          // user sees rather than the raw settlement account name.
          title: 'X2Factor',
          description: title,
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

    // Keep the raw provider response on the payment row — the admin
    // payment-gateway view surfaces this for debugging without needing
    // to dig through Flutterwave's own dashboard.
    await db
      .update(payments)
      .set({ rawResponse: JSON.stringify(body), updatedAt: new Date() })
      .where(eq(payments.reference, reference));

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

    const depositUser = await db.query.users.findFirst({
      where: eq(users.id, payment.userId),
    });
    if (depositUser) {
      this.mailer
        ?.sendDepositSuccessful(depositUser.email, depositUser.firstName, payment.amount)
        .catch((err) =>
          this.logger.error(
            `Failed to send deposit-successful email to ${depositUser.email}`,
            err instanceof Error ? err.stack : err,
          ),
        );

      this.notificationsService
        ?.create({
          userId: depositUser.id,
          title: 'Deposit successful',
          message: `Your deposit of ₦${payment.amount} was successful and has been added to your wallet.`,
          type: 'deposit_completed',
          metadata: { paymentReference: payment.reference, amount: payment.amount },
        })
        .catch((err) =>
          this.logger.error(
            `Failed to create deposit-completed notification for user ${depositUser.id}`,
            err instanceof Error ? err.stack : err,
          ),
        );
    }

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
   *
   * Flutterwave only allows one webhook URL per account, so this and
   * transfer events (see WithdrawalsService.handleTransferWebhook) both
   * arrive at the same shared endpoint (see WebhooksController) and are
   * routed here by event type — only handle charge events, never a
   * transfer payload that happens to share field names.
   */
  async handleFlutterwaveWebhook(
    signature: string | undefined,
    body: { event?: string; data?: { tx_ref?: string; status?: string } },
  ) {
    const secretHash = this.configService?.get<string>(
      'flutterwave.secretHash',
    );

    if (!secretHash || !signature || signature !== secretHash) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (body.event && !body.event.startsWith('charge.')) {
      return { received: true };
    }

    const txRef = body.data?.tx_ref;

    if (txRef) {
      await db
        .update(payments)
        .set({ rawResponse: JSON.stringify(body), updatedAt: new Date() })
        .where(eq(payments.reference, txRef));
    }

    if (!txRef || body.data?.status !== 'successful') {
      return { received: true };
    }

    await this.verifyFlutterwavePayment(txRef);
    return { received: true };
  }

  async failPayment(
    reference: string,
    reason?: string,
    options?: { skipEmail?: boolean },
  ) {
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

      if (!options?.skipEmail) {
        const depositUser = await db.query.users.findFirst({
          where: eq(users.id, payment.userId),
        });
        if (depositUser) {
          this.mailer
            ?.sendDepositFailed(
              depositUser.email,
              depositUser.firstName,
              payment.amount,
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
    }

    return updatedPayment;
  }

  /**
   * Called when a user cancels a Flutterwave checkout instead of
   * completing it. Only the owning user may cancel their own payment,
   * and only while it's still pending/processing.
   */
  async cancelPayment(userId: string, reference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new BadRequestException('Only a pending payment can be cancelled');
    }

    return this.failPayment(reference, 'Cancelled by user', {
      skipEmail: true,
    });
  }

  /**
   * Called when the dedicated account / USSD code shown on the custom
   * funding screen (see FundWalletModal) times out with no payment
   * received. Same effect as cancelPayment but keeps a distinct failure
   * reason so the deposit history can tell "user backed out" apart from
   * "window expired" and Flutterwave's webhook doesn't race a late
   * transfer against this — completePayment()/verifyFlutterwavePayment()
   * are idempotent no-ops once status is already 'successful', but here
   * the payment is still only 'processing'/'pending' at expiry time, so a
   * webhook arriving moments later would otherwise credit a wallet whose
   * deposit we'd just marked failed. We re-check with Flutterwave first
   * to avoid that race instead of trusting the client's countdown alone.
   */
  async expirePayment(userId: string, reference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'successful') {
      return payment;
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new BadRequestException('Only a pending payment can be expired');
    }

    if (payment.provider === 'flutterwave') {
      try {
        // If it actually went through in the last few seconds, this
        // completes it as successful instead of failing it out from
        // under the user.
        return await this.verifyFlutterwavePayment(reference);
      } catch {
        // Not successful — fall through to marking it failed below.
      }
    }

    return this.failPayment(reference, 'Payment window expired', {
      skipEmail: true,
    });
  }
}
