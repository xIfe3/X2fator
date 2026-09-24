import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and, gt, inArray, isNull } from 'drizzle-orm';
import { nigerianPhoneVariants } from '../common/decorators/nigerian-phone.decorator';
import { createHash, randomBytes } from 'crypto';
import { Inject } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MAILER, type Mailer } from '../mail/mailer.service';
import {
  db,
  users,
  wallets,
  roles,
  userRoles,
  passwordResetTokens,
  referrals,
  plans,
  payments,
} from '../database';
import { PasswordService } from './password.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PaymentsService } from '../payments/payments.service';
import { SiteContentService } from '../site-content/site-content.service';
import { UserPermissionsService } from '../common/services/user-permissions.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly siteContentService: SiteContentService,
    private readonly userPermissionsService: UserPermissionsService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * Removes a `pending` user (and its pending signup payment, and any
   * referral row recording who invited them) that never completed
   * payment, so the email/phone can be reused by a fresh registration.
   * `payments.userId` and `referrals.referredUserId` are both
   * `onDelete: restrict`, so those rows must go before the user row.
   */
  private async discardAbandonedPendingUser(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(payments).where(eq(payments.userId, userId));
      await tx.delete(referrals).where(eq(referrals.referredUserId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const results = await db
      .select({
        name: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return results.map((role) => role.name);
  }

  /**
   * Registration requires paying for a plan up front. This creates the
   * user as `status: 'pending'` (can't log in yet) plus a pending
   * Flutterwave payment for the chosen plan, and returns a checkout URL.
   * The account only becomes active — and the plan subscription only
   * gets created — once `confirmRegistrationPayment` sees the payment
   * succeed.
   *
   * A `pending` user who never completes payment must not permanently
   * squat the email: if the existing row for this email is still
   * `pending`, it (and its pending registration payment) is discarded and
   * registration proceeds fresh. Only a real (`active`/other non-pending)
   * account blocks a duplicate signup.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser && existingUser.status !== 'pending') {
      throw new ConflictException('An account with this email already exists');
    }

    if (existingUser && existingUser.status === 'pending') {
      await this.discardAbandonedPendingUser(existingUser.id);
    }

    if (dto.phone) {
      const existingPhoneUser = await db.query.users.findFirst({
        where: inArray(users.phone, nigerianPhoneVariants(dto.phone)),
      });

      if (existingPhoneUser) {
        if (existingPhoneUser.status !== 'pending') {
          throw new ConflictException(
            'An account with this phone number already exists',
          );
        }

        await this.discardAbandonedPendingUser(existingPhoneUser.id);
      }
    }

    const username = dto.username.trim().toLowerCase();

    const existingUsernameUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUsernameUser) {
      if (existingUsernameUser.status !== 'pending') {
        throw new ConflictException('This username is already taken');
      }

      await this.discardAbandonedPendingUser(existingUsernameUser.id);
    }

    const sections = await this.siteContentService.getAll();
    const flags = (sections.feature_flags ?? {}) as Record<string, unknown>;
    const requirePlanPurchase = flags.requirePlanPurchase !== false;

    let plan: typeof plans.$inferSelect | undefined;

    if (requirePlanPurchase) {
      if (!dto.planId) {
        throw new BadRequestException('A plan is required to register');
      }

      plan = await db.query.plans.findFirst({
        where: and(eq(plans.id, dto.planId), eq(plans.status, 'active')),
      });

      if (!plan) {
        throw new NotFoundException('Selected plan is not available');
      }
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    // The username doubles as the referral code — one human-readable
    // handle instead of two separate codes.
    const referralCode = username;

    // When no plan purchase is required, the account activates
    // immediately — no pending payment, no Flutterwave checkout.
    const initialStatus = requirePlanPurchase ? 'pending' : 'active';

    const { user, payment } = await db.transaction(async (tx) => {
      let referredById: string | undefined;

      if (dto.referralCode) {
        const referrer = await tx.query.users.findFirst({
          where: eq(users.referralCode, dto.referralCode.trim().toLowerCase()),
        });

        if (!referrer) {
          throw new ConflictException('Invalid referral code');
        }

        referredById = referrer.id;
      }

      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          username,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone,
          referralCode,
          referredById,
          status: initialStatus,
        })
        .returning();

      const defaultRole = await tx.query.roles.findFirst({
        where: eq(roles.name, 'user'),
      });

      if (!defaultRole) {
        throw new ConflictException('Default user role is not configured');
      }

      await tx.insert(userRoles).values({
        userId: newUser.id,
        roleId: defaultRole.id,
      });

      await tx.insert(wallets).values([
        {
          userId: newUser.id,
          type: 'account',
          balance: '0',
          status: 'active',
        },
        { userId: newUser.id, type: 'task', balance: '0', status: 'active' },
        {
          userId: newUser.id,
          type: 'referral',
          balance: '0',
          status: 'active',
        },
      ]);

      if (referredById) {
        await tx.insert(referrals).values({
          referrerId: referredById,
          referredUserId: newUser.id,
          commissionRate: '0',
          status: 'active',
        });
      }

      if (!requirePlanPurchase) {
        return { user: newUser, payment: undefined };
      }

      const paymentReference = this.generateReference('REG');

      const [newPayment] = await tx
        .insert(payments)
        .values({
          userId: newUser.id,
          provider: 'flutterwave',
          reference: paymentReference,
          amount: plan!.price,
          status: 'pending',
          metadata: { purpose: 'plan_purchase', planId: plan!.id },
        })
        .returning();

      return { user: newUser, payment: newPayment };
    });

    if (!requirePlanPurchase) {
      const userRolesList = await this.getUserRoles(user.id);
      const permissions = await this.userPermissionsService.getPermissionNames(
        user.id,
      );
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        userRolesList,
      );

      this.mailer
        .sendWelcome(user.email, user.firstName)
        .catch((err) =>
          this.logger.error(
            `Failed to send welcome email to ${user.email}`,
            err instanceof Error ? err.stack : err,
          ),
        );

      return {
        user: {
          ...this.sanitizeUser(user),
          roles: userRolesList,
          permissions,
        },
        ...tokens,
      };
    }

    // Payment happens in-app (same custom bank transfer / USSD screen as
    // wallet deposits) — the client follows up with
    // initializeRegistrationCharge() once the user picks a method.
    return {
      userId: user.id,
      paymentReference: payment!.reference,
      amount: payment!.amount,
      planName: plan!.name,
    };
  }

  initializeRegistrationCharge(
    paymentReference: string,
    method: 'bank_transfer' | 'ussd',
  ) {
    return this.paymentsService.initializeRegistrationCharge(
      paymentReference,
      method,
    );
  }

  /**
   * Called when the user cancels the Flutterwave checkout for a signup
   * plan purchase (Flutterwave's redirect carries `status=cancelled`).
   * Immediately discards the still-`pending` user and payment so the
   * email/phone is free to register again right away, instead of leaving
   * it to be cleaned up lazily on the next registration attempt.
   *
   * No-ops (rather than erroring) if the account already activated in
   * the meantime — e.g. the webhook raced ahead and confirmed payment
   * before this cancel request arrived.
   */
  async cancelRegistrationPayment(
    paymentReference: string,
  ): Promise<{ message: string }> {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, paymentReference),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const metadata = payment.metadata as
      | { purpose?: string; planId?: string }
      | null;

    if (metadata?.purpose !== 'plan_purchase' || !metadata.planId) {
      throw new BadRequestException('Not a registration payment');
    }

    if (payment.status === 'successful') {
      return { message: 'Registration already completed.' };
    }

    // The in-app payment window can expire just as a transfer lands —
    // re-check with Flutterwave before throwing the signup away, so a
    // paid user is activated instead of deleted.
    if (payment.status === 'processing') {
      try {
        await this.paymentsService.verifyFlutterwavePaymentPublic(
          paymentReference,
        );
        return { message: 'Registration already completed.' };
      } catch {
        // Not paid — discard below.
      }
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payment.userId),
    });

    if (user && user.status === 'pending') {
      await this.discardAbandonedPendingUser(user.id);
    }

    return { message: 'Registration cancelled.' };
  }

  /**
   * Called after the user returns from Flutterwave (or the webhook fires
   * first). Verifies payment, activates the account, creates the plan
   * subscription, and — only now — issues login tokens.
   */
  async confirmRegistrationPayment(paymentReference: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, paymentReference),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const metadata = payment.metadata as
      | { purpose?: string; planId?: string }
      | null;

    if (metadata?.purpose !== 'plan_purchase' || !metadata.planId) {
      throw new BadRequestException('Not a registration payment');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payment.userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'active') {
      // Re-checks with Flutterwave and activates on success. Safe to call
      // even if the webhook already activated the account in the
      // meantime — activatePlanPurchase() is idempotent on payment status.
      await this.paymentsService.verifyFlutterwavePaymentPublic(
        paymentReference,
      );
    }

    const activatedUser = await db.query.users.findFirst({
      where: eq(users.id, payment.userId),
    });

    if (!activatedUser) {
      throw new NotFoundException('User not found');
    }

    const userRolesList = await this.getUserRoles(activatedUser.id);
    const permissions = await this.userPermissionsService.getPermissionNames(
      activatedUser.id,
    );

    const tokens = await this.generateTokens(
      activatedUser.id,
      activatedUser.email,
      userRolesList,
    );

    this.mailer
      .sendWelcome(activatedUser.email, activatedUser.firstName)
      .catch((err) =>
        this.logger.error(
          `Failed to send welcome email to ${activatedUser.email}`,
          err instanceof Error ? err.stack : err,
        ),
      );

    return {
      user: {
        ...this.sanitizeUser(activatedUser),
        roles: userRolesList,
        permissions,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const userRolesList = await this.getUserRoles(user.id);
    const permissions = await this.userPermissionsService.getPermissionNames(
      user.id,
    );

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      userRolesList,
    );

    return {
      user: {
        ...this.sanitizeUser(user),
        roles: userRolesList,
        permissions,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: {
      sub: string;
      email: string;
      type: 'refresh';
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is unavailable');
    }

    const userRolesList = await this.getUserRoles(user.id);

    return this.generateTokens(user.id, user.email, userRolesList);
  }

  private async generateTokens(userId: string, email: string, roles: string[]) {
    const accessExpiresIn = (this.configService.get<string>(
      'jwt.accessExpiresIn',
    ) ?? '15m') as JwtSignOptions['expiresIn'];

    const refreshExpiresIn = (this.configService.get<string>(
      'jwt.refreshExpiresIn',
    ) ?? '30d') as JwtSignOptions['expiresIn'];

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        roles,
        type: 'access',
      },
      {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        roles,
        type: 'refresh',
      },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private sanitizeUser(user: typeof users.$inferSelect) {
    const { passwordHash, ...safeUser } = user;

    return safeUser;
  }

  /**
   * Public username-availability check used by the registration form's
   * live "checking..." indicator. A username is only "available" if it's
   * both unused and passes the same format rule enforced by RegisterDto
   * — invalid input is reported as unavailable rather than a validation
   * error, since the UI just wants a yes/no to render.
   */
  async checkUsernameAvailability(username: string) {
    const normalized = username.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalized)) {
      return { available: false };
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.username, normalized),
    });

    // A still-pending signup (abandoned checkout) doesn't permanently
    // squat the username, same as email/phone elsewhere in register().
    return { available: !existing || existing.status === 'pending' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateReference(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
  }

  async requestPasswordReset(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const genericResponse = {
      message:
        'If an account exists for that email, a reset link has been sent.',
    };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    // Never reveal whether the email exists, and skip non-active accounts silently.
    if (!user || user.status !== 'active') {
      return genericResponse;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const webUrl =
      this.configService.get<string>('app.webUrl') ?? 'http://localhost:3001';
    const resetUrl = `${webUrl}/reset-password?token=${rawToken}`;
    await this.mailer.sendPasswordReset(user.email, resetUrl);

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);

    const record = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    });

    if (!record) {
      throw new UnauthorizedException(
        'This reset link is invalid or has expired',
      );
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, record.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, record.id));
    });

    return { message: 'Password updated successfully.' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentPasswordValid = await this.passwordService.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { message: 'Password updated successfully.' };
  }

  /**
   * Whether the current user still needs to see the "join our Telegram"
   * popup — false once they've either joined or dismissed it, or once
   * the feature is turned off platform-wide.
   */
  async getTelegramPromptStatus(userId: string) {
    const sections = await this.siteContentService.getAll();
    const telegram = (sections.telegram ?? {}) as {
      enabled?: boolean;
      channelUrl?: string;
      groupUrl?: string;
    };

    if (telegram.enabled === false || !telegram.channelUrl) {
      return {
        shouldShow: false,
        channelUrl: telegram.channelUrl ?? '',
        groupUrl: telegram.groupUrl ?? '',
      };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { telegramPromptSeenAt: true },
    });

    return {
      shouldShow: !user?.telegramPromptSeenAt,
      channelUrl: telegram.channelUrl,
      groupUrl: telegram.groupUrl ?? '',
    };
  }

  /**
   * Records that the user says they've joined both the Telegram
   * channel and group — self-reported (there's no bot integration to
   * verify actual membership), same trust level as a plain dismiss,
   * just recorded distinctly so "joined" and "dismissed without
   * joining" aren't conflated if that distinction is ever needed.
   */
  async markTelegramJoined(userId: string): Promise<{ message: string }> {
    await db
      .update(users)
      .set({
        telegramPromptSeenAt: new Date(),
        telegramJoinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { message: 'Thanks for joining!' };
  }

  async markTelegramPromptSeen(userId: string): Promise<{ message: string }> {
    await db
      .update(users)
      .set({ telegramPromptSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { message: 'Preference saved.' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const values: Partial<typeof users.$inferInsert> = {};

    for (const field of ['firstName', 'lastName', 'phone', 'gender'] as const) {
      if (dto[field] !== undefined) {
        values[field] = dto[field] as never;
      }
    }

    if (Object.keys(values).length === 0) {
      return this.sanitizeUser(user);
    }

    values.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, userId))
      .returning();

    return this.sanitizeUser(updated);
  }
}
