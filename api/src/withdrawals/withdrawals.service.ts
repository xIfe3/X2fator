import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import {
  db,
  userBankAccounts,
  users,
  walletTransactions,
  wallets,
  withdrawals,
} from '../database';

import { WithdrawalSettingsService } from './withdrawal-settings.service';
import { FlutterwaveAccountsService } from './flutterwave-accounts.service';
import { MAILER, type Mailer } from '../mail/mailer.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);
  private readonly pinSaltRounds = 10;

  constructor(
    private readonly withdrawalSettingsService: WithdrawalSettingsService,
    private readonly flutterwaveAccountsService: FlutterwaveAccountsService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() @Inject(MAILER) private readonly mailer?: Mailer,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Whether the user has already set a withdrawal PIN.
   */
  async getPinStatus(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { withdrawalPinHash: true },
    });

    return { isSet: Boolean(user?.withdrawalPinHash) };
  }

  /**
   * Sets (or replaces) the user's withdrawal PIN. There is no separate
   * "change PIN" flow yet — setting it again simply overwrites the old one.
   */
  async setPin(userId: string, pin: string) {
    const withdrawalPinHash = await bcrypt.hash(pin, this.pinSaltRounds);

    await db
      .update(users)
      .set({ withdrawalPinHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { message: 'Withdrawal PIN set successfully.' };
  }

  private async assertValidPin(userId: string, pin: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { withdrawalPinHash: true },
    });

    if (!user?.withdrawalPinHash) {
      throw new BadRequestException(
        'Set a withdrawal PIN before requesting a withdrawal',
      );
    }

    const valid = await bcrypt.compare(pin, user.withdrawalPinHash);

    if (!valid) {
      throw new UnauthorizedException('Incorrect withdrawal PIN');
    }
  }

  /**
   * All of the user's saved payout accounts, most-recently-added first.
   */
  async listBankAccounts(userId: string) {
    return db.query.userBankAccounts.findMany({
      where: eq(userBankAccounts.userId, userId),
      orderBy: [desc(userBankAccounts.createdAt)],
    });
  }

  /**
   * Adds a new saved payout account after re-verifying it with
   * Flutterwave (never trust a client-supplied account name). The first
   * account a user adds becomes their default automatically.
   */
  async addBankAccount(
    userId: string,
    params: { bankCode: string; bankName: string; accountNumber: string },
  ) {
    const { accountName } = await this.flutterwaveAccountsService.resolveAccount(
      params.accountNumber,
      params.bankCode,
    );

    const existing = await db.query.userBankAccounts.findFirst({
      where: and(
        eq(userBankAccounts.userId, userId),
        eq(userBankAccounts.bankCode, params.bankCode),
        eq(userBankAccounts.accountNumber, params.accountNumber),
      ),
    });

    if (existing) {
      throw new BadRequestException('This account has already been saved for this bank');
    }

    const accountCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userBankAccounts)
      .where(eq(userBankAccounts.userId, userId));

    const [account] = await db
      .insert(userBankAccounts)
      .values({
        userId,
        bankCode: params.bankCode,
        bankName: params.bankName,
        accountNumber: params.accountNumber,
        accountName,
        isDefault: (accountCount[0]?.count ?? 0) === 0,
      })
      .returning();

    return account;
  }

  /**
   * Removes a saved payout account. If it was the default and other
   * accounts remain, the most recently added one becomes the new default.
   */
  async deleteBankAccount(userId: string, accountId: string) {
    const account = await db.query.userBankAccounts.findFirst({
      where: and(
        eq(userBankAccounts.id, accountId),
        eq(userBankAccounts.userId, userId),
      ),
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    await db
      .delete(userBankAccounts)
      .where(eq(userBankAccounts.id, accountId));

    if (account.isDefault) {
      const next = await db.query.userBankAccounts.findFirst({
        where: eq(userBankAccounts.userId, userId),
        orderBy: [desc(userBankAccounts.createdAt)],
      });

      if (next) {
        await db
          .update(userBankAccounts)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(userBankAccounts.id, next.id));
      }
    }

    return { message: 'Bank account removed.' };
  }

  /**
   * Marks one of the user's saved accounts as the default, demoting
   * whichever one previously held that spot.
   */
  async setDefaultBankAccount(userId: string, accountId: string) {
    const account = await db.query.userBankAccounts.findFirst({
      where: and(
        eq(userBankAccounts.id, accountId),
        eq(userBankAccounts.userId, userId),
      ),
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(userBankAccounts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(userBankAccounts.userId, userId),
            eq(userBankAccounts.isDefault, true),
          ),
        );

      await tx
        .update(userBankAccounts)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(userBankAccounts.id, accountId));
    });

    return { message: 'Default account updated.' };
  }

  /**
   * Create a withdrawal request.
   *
   * Funds are deducted immediately from the relevant wallet.
   * If the withdrawal is later rejected/cancelled,
   * the funds are returned to that wallet.
   *
   * - Referral wallet: withdrawable anytime, subject to an admin-set minimum.
   * - Task wallet: withdrawable only on the admin-set day of the month.
   */
  async createWithdrawal(
    userId: string,
    params: {
      walletType: 'task' | 'referral';
      amount: string;
      bankName: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
      pin: string;
    },
  ) {
    const amount = Number(params.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    await this.assertValidPin(userId, params.pin);

    const settings = await this.withdrawalSettingsService.get();

    if (params.walletType === 'referral') {
      const minimum = Number(settings.referralMinimumWithdrawal);
      if (amount < minimum) {
        throw new BadRequestException(
          `Minimum referral withdrawal is ${minimum.toFixed(2)}`,
        );
      }
    } else {
      const today = new Date().getDate();
      if (today !== settings.taskWithdrawalDay) {
        throw new BadRequestException(
          `Task wallet withdrawals only open on day ${settings.taskWithdrawalDay} of each month`,
        );
      }
    }

    const fee = 0;
    const netAmount = amount - fee;

    return db.transaction(async (tx) => {
      const wallet = await tx.query.wallets.findFirst({
        where: and(
          eq(wallets.userId, userId),
          eq(wallets.type, params.walletType),
        ),
      });

      if (!wallet) {
        throw new NotFoundException(`${params.walletType} wallet not found`);
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
          walletType: params.walletType,
          amount: amount.toFixed(2),
          fee: fee.toFixed(2),
          netAmount: netAmount.toFixed(2),
          bankName: params.bankName,
          bankCode: params.bankCode,
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

      const requestingUser = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (requestingUser) {
        this.mailer
          ?.sendWithdrawalRequested(
            requestingUser.email,
            requestingUser.firstName,
            amount.toFixed(2),
          )
          .catch((err) =>
            this.logger.error(
              `Failed to send withdrawal-requested email to ${requestingUser.email}`,
              err instanceof Error ? err.stack : err,
            ),
          );
      }

      return withdrawal;
    }).then(async (withdrawal) => {
      // Best-effort convenience save; a failure here shouldn't block the
      // withdrawal that already succeeded.
      this.upsertBankAccount(userId, {
        bankCode: params.bankCode,
        bankName: params.bankName,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
      }).catch((err) =>
        this.logger.error(
          `Failed to save bank account for user ${userId}`,
          err instanceof Error ? err.stack : err,
        ),
      );

      // When auto-payout is switched off, an admin reviews and pays out
      // manually — leave the withdrawal exactly as created (`pending`),
      // the original flow before automatic transfers existed.
      if (!settings.autoPayoutEnabled) {
        return withdrawal;
      }

      // The transfer call is a real network request to Flutterwave, kept
      // outside the DB transaction above so a slow/failed HTTP call never
      // holds a database transaction open. If it fails to even be
      // *accepted* by Flutterwave, the withdrawal is rejected and the
      // wallet refunded immediately — final success/failure of an
      // accepted transfer is decided later by the webhook.
      try {
        const { transferId } =
          await this.flutterwaveAccountsService.initiateTransfer({
            reference: withdrawal.transactionReference,
            accountNumber: params.accountNumber,
            bankCode: params.bankCode,
            amount: Number(withdrawal.netAmount),
            narration: 'X2Factor withdrawal',
          });

        const [updated] = await db
          .update(withdrawals)
          .set({
            status: 'processing',
            providerTransferId: transferId,
            updatedAt: new Date(),
          })
          .where(eq(withdrawals.id, withdrawal.id))
          .returning();

        return updated;
      } catch (err) {
        this.logger.error(
          `Failed to initiate Flutterwave transfer for withdrawal ${withdrawal.id}`,
          err instanceof Error ? err.stack : err,
        );
        return this.failWithdrawal(
          withdrawal.id,
          'Could not initiate payout. Please try again.',
        );
      }
    });
  }

  /**
   * Saves a bank account the user just withdrew to as a convenience, if
   * it isn't already saved — the first account saved becomes default.
   * Unlike `addBankAccount`, this never re-verifies with Flutterwave
   * since the caller already just did that via the withdrawal itself.
   */
  private async upsertBankAccount(
    userId: string,
    account: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    },
  ) {
    const existing = await db.query.userBankAccounts.findFirst({
      where: and(
        eq(userBankAccounts.userId, userId),
        eq(userBankAccounts.bankCode, account.bankCode),
        eq(userBankAccounts.accountNumber, account.accountNumber),
      ),
    });

    if (existing) return;

    const accountCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userBankAccounts)
      .where(eq(userBankAccounts.userId, userId));

    await db.insert(userBankAccounts).values({
      userId,
      ...account,
      isDefault: (accountCount[0]?.count ?? 0) === 0,
    });
  }

  /**
   * Marks a withdrawal rejected and refunds the wallet — used both when
   * Flutterwave fails to accept the transfer and when its webhook later
   * reports the transfer itself failed.
   */
  private async failWithdrawal(withdrawalId: string, reason: string) {
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
        return withdrawal;
      }

      const wallet = await tx.query.wallets.findFirst({
        where: and(
          eq(wallets.userId, withdrawal.userId),
          eq(wallets.type, withdrawal.walletType),
        ),
      });

      if (wallet) {
        const balanceBefore = Number(wallet.balance);
        const amount = Number(withdrawal.amount);
        const balanceAfter = balanceBefore + amount;

        await tx
          .update(wallets)
          .set({ balance: balanceAfter.toFixed(2), updatedAt: new Date() })
          .where(eq(wallets.id, wallet.id));

        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: 'refund',
          direction: 'credit',
          amount: amount.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          reference: this.generateReference('WDR'),
          description: 'Failed withdrawal refund',
          metadata: {
            withdrawalId: withdrawal.id,
            withdrawalReference: withdrawal.transactionReference,
          },
          status: 'completed',
        });
      }

      const [updated] = await tx
        .update(withdrawals)
        .set({
          status: 'rejected',
          rejectionReason: reason,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId))
        .returning();

      const withdrawingUser = await tx.query.users.findFirst({
        where: eq(users.id, withdrawal.userId),
      });
      if (withdrawingUser) {
        this.mailer
          ?.sendWithdrawalRejected(
            withdrawingUser.email,
            withdrawingUser.firstName,
            withdrawal.amount,
            reason,
          )
          .catch((err) =>
            this.logger.error(
              `Failed to send withdrawal-rejected email to ${withdrawingUser.email}`,
              err instanceof Error ? err.stack : err,
            ),
          );

        this.notificationsService
          ?.create({
            userId: withdrawingUser.id,
            title: 'Withdrawal rejected',
            message: `Your withdrawal of ₦${withdrawal.amount} was rejected: ${reason}`,
            type: 'withdrawal_rejected',
            metadata: {
              withdrawalId: withdrawal.id,
              amount: withdrawal.amount,
              reason,
            },
          })
          .catch((err) =>
            this.logger.error(
              `Failed to create withdrawal-rejected notification for user ${withdrawingUser.id}`,
              err instanceof Error ? err.stack : err,
            ),
          );
      }

      return updated;
    });
  }

  /**
   * Marks a withdrawal completed once Flutterwave confirms the transfer
   * succeeded — called from the transfer webhook.
   */
  private async completeWithdrawal(withdrawalId: string) {
    const withdrawal = await db.query.withdrawals.findFirst({
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
      return withdrawal;
    }

    const [updated] = await db
      .update(withdrawals)
      .set({ status: 'completed', processedAt: new Date(), updatedAt: new Date() })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    const withdrawingUser = await db.query.users.findFirst({
      where: eq(users.id, withdrawal.userId),
    });
    if (withdrawingUser) {
      this.mailer
        ?.sendWithdrawalApproved(
          withdrawingUser.email,
          withdrawingUser.firstName,
          withdrawal.amount,
        )
        .catch((err) =>
          this.logger.error(
            `Failed to send withdrawal-approved email to ${withdrawingUser.email}`,
            err instanceof Error ? err.stack : err,
          ),
        );

      this.notificationsService
        ?.create({
          userId: withdrawingUser.id,
          title: 'Withdrawal completed',
          message: `Your withdrawal of ₦${withdrawal.amount} has been paid out successfully.`,
          type: 'withdrawal_completed',
          metadata: { withdrawalId: withdrawal.id, amount: withdrawal.amount },
        })
        .catch((err) =>
          this.logger.error(
            `Failed to create withdrawal-completed notification for user ${withdrawingUser.id}`,
            err instanceof Error ? err.stack : err,
          ),
        );
    }

    return updated;
  }

  /**
   * Handles Flutterwave's `transfer.completed` webhook event. Looks the
   * withdrawal up by the transfer id we stored when initiating it, and
   * finalizes it as completed or rejected (with a refund) based on the
   * transfer's reported status. Idempotent: replays of the same event
   * (Flutterwave delivers at-least-once) are detected via `eventId` and
   * ignored once already processed.
   */
  async handleTransferWebhook(
    signature: string | undefined,
    body: {
      event?: string;
      data?: { id?: number; status?: string; reference?: string };
    },
  ) {
    const expectedSecretHash = this.configService?.get<string>(
      'flutterwave.secretHash',
    );

    if (!expectedSecretHash || !signature || signature !== expectedSecretHash) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (body.event !== 'transfer.completed' || !body.data?.id) {
      return { received: true };
    }

    const transferId = String(body.data.id);
    const eventId = `${transferId}:${body.data.status ?? ''}`;

    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.providerTransferId, transferId),
    });

    if (!withdrawal) {
      return { received: true };
    }

    if (withdrawal.providerEventId === eventId) {
      return { received: true };
    }

    await db
      .update(withdrawals)
      .set({ providerEventId: eventId, updatedAt: new Date() })
      .where(eq(withdrawals.id, withdrawal.id));

    if (body.data.status === 'SUCCESSFUL') {
      await this.completeWithdrawal(withdrawal.id);
    } else if (body.data.status === 'FAILED') {
      await this.failWithdrawal(
        withdrawal.id,
        'Bank transfer failed. Funds have been returned to your wallet.',
      );
    }

    return { received: true };
  }

  /**
   * Admin: manually re-checks a `processing` withdrawal's real status
   * directly with Flutterwave and finalizes it accordingly — a fallback
   * for when the transfer webhook is missed, delayed, or misconfigured
   * (e.g. wrong URL registered), which otherwise leaves a withdrawal
   * stuck showing "processing" indefinitely even after Flutterwave has
   * already resolved it.
   */
  async reconcileWithdrawal(withdrawalId: string) {
    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawalId),
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (!withdrawal.providerTransferId) {
      throw new BadRequestException(
        'This withdrawal was never sent to Flutterwave — nothing to reconcile',
      );
    }

    if (withdrawal.status !== 'processing') {
      return withdrawal;
    }

    const { status } = await this.flutterwaveAccountsService.getTransferStatus(
      withdrawal.providerTransferId,
    );

    if (status === 'SUCCESSFUL') {
      return this.completeWithdrawal(withdrawal.id);
    }

    if (status === 'FAILED') {
      return this.failWithdrawal(
        withdrawal.id,
        'Bank transfer failed. Funds have been returned to your wallet.',
      );
    }

    return withdrawal;
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
            eq(wallets.type, withdrawal.walletType),
          ),
        });

        if (!wallet) {
          throw new NotFoundException(
            `${withdrawal.walletType} wallet not found`,
          );
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

      if (params.status === 'completed' || params.status === 'rejected') {
        const withdrawingUser = await tx.query.users.findFirst({
          where: eq(users.id, withdrawal.userId),
        });
        if (withdrawingUser) {
          const send =
            params.status === 'completed'
              ? this.mailer?.sendWithdrawalApproved(
                  withdrawingUser.email,
                  withdrawingUser.firstName,
                  withdrawal.amount,
                )
              : this.mailer?.sendWithdrawalRejected(
                  withdrawingUser.email,
                  withdrawingUser.firstName,
                  withdrawal.amount,
                  params.rejectionReason,
                );
          send?.catch((err) =>
            this.logger.error(
              `Failed to send withdrawal-${params.status} email to ${withdrawingUser.email}`,
              err instanceof Error ? err.stack : err,
            ),
          );

          this.notificationsService
            ?.create(
              params.status === 'completed'
                ? {
                    userId: withdrawingUser.id,
                    title: 'Withdrawal completed',
                    message: `Your withdrawal of ₦${withdrawal.amount} has been paid out successfully.`,
                    type: 'withdrawal_completed',
                    metadata: { withdrawalId: withdrawal.id, amount: withdrawal.amount },
                  }
                : {
                    userId: withdrawingUser.id,
                    title: 'Withdrawal rejected',
                    message: `Your withdrawal of ₦${withdrawal.amount} was rejected: ${params.rejectionReason}`,
                    type: 'withdrawal_rejected',
                    metadata: {
                      withdrawalId: withdrawal.id,
                      amount: withdrawal.amount,
                      reason: params.rejectionReason,
                    },
                  },
            )
            .catch((err) =>
              this.logger.error(
                `Failed to create withdrawal-${params.status} notification for user ${withdrawingUser.id}`,
                err instanceof Error ? err.stack : err,
              ),
            );
        }
      }

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
