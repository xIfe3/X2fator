import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { Inject } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
} from '@2xfactor/database';
import { PasswordService } from './password.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

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
   * succeed. This avoids ever activating a login for someone who never
   * pays, while still keeping the email/referral code reserved so a
   * duplicate signup attempt is rejected rather than silently allowed.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const plan = await db.query.plans.findFirst({
      where: and(eq(plans.id, dto.planId), eq(plans.status, 'active')),
    });

    if (!plan) {
      throw new NotFoundException('Selected plan is not available');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const referralCode = await this.generateReferralCode(email);

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
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone,
          referralCode,
          referredById,
          status: 'pending',
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

      const paymentReference = this.generateReference('REG');

      const [newPayment] = await tx
        .insert(payments)
        .values({
          userId: newUser.id,
          provider: 'flutterwave',
          reference: paymentReference,
          amount: plan.price,
          status: 'pending',
          metadata: { purpose: 'plan_purchase', planId: plan.id },
        })
        .returning();

      return { user: newUser, payment: newPayment };
    });

    const checkout = await this.paymentsService.initializeRawPayment(
      user.id,
      payment.reference,
    );

    return {
      userId: user.id,
      paymentReference: payment.reference,
      authorizationUrl: checkout.authorizationUrl,
    };
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

    const tokens = await this.generateTokens(
      activatedUser.id,
      activatedUser.email,
      userRolesList,
    );

    this.mailer
      .sendWelcome(activatedUser.email, activatedUser.firstName)
      .catch(() => undefined);

    return {
      user: {
        ...this.sanitizeUser(activatedUser),
        roles: userRolesList,
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

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      userRolesList,
    );

    return {
      user: {
        ...this.sanitizeUser(user),
        roles: userRolesList,
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

  private async generateReferralCode(email: string) {
    // Extract email slug (part before @)
    const emailSlug = email.split('@')[0].toLowerCase();
    let code = emailSlug;

    // Check if the base slug exists
    let existing = await db.query.users.findFirst({
      where: eq(users.referralCode, code),
    });

    // If it exists, append numeric suffix until we find a unique one
    if (existing) {
      let counter = 1;
      do {
        code = `${emailSlug}${counter}`;
        existing = await db.query.users.findFirst({
          where: eq(users.referralCode, code),
        });
        counter++;
      } while (existing && counter < 1000); // Safety limit
    }

    return code;
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
}
