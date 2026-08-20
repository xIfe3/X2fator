import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { Inject } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MAILER, type Mailer } from '../mail/mailer.service';
import {
  db,
  users,
  wallets,
  roles,
  userRoles,
  passwordResetTokens,
  referrals,
} from '@2xfactor/database';
import { PasswordService } from './password.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const referralCode = await this.generateReferralCode();

    const result = await db.transaction(async (tx) => {
      let referredById: string | undefined;

      if (dto.referralCode) {
        const referrer = await tx.query.users.findFirst({
          where: eq(users.referralCode, dto.referralCode.trim().toUpperCase()),
        });

        if (!referrer) {
          throw new ConflictException('Invalid referral code');
        }

        referredById = referrer.id;
      }

      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone,
          referralCode,
          referredById,
          status: 'active',
        })
        .returning();

      const defaultRole = await tx.query.roles.findFirst({
        where: eq(roles.name, 'user'),
      });

      if (!defaultRole) {
        throw new ConflictException('Default user role is not configured');
      }

      await tx.insert(userRoles).values({
        userId: user.id,
        roleId: defaultRole.id,
      });

      await tx.insert(wallets).values([
        {
          userId: user.id,
          type: 'account',
          balance: '0',
          status: 'active',
        },
        {
          userId: user.id,
          type: 'earnings',
          balance: '0',
          status: 'active',
        },
      ]);

      if (referredById) {
        await tx.insert(referrals).values({
          referrerId: referredById,
          referredUserId: user.id,
          commissionRate: '0',
          status: 'active',
        });
      }

      return user;
    });

    const userRolesList = await this.getUserRoles(result.id);

    const tokens = await this.generateTokens(
      result.id,
      result.email,
      userRolesList,
    );

    return {
      user: {
        ...this.sanitizeUser(result),
        roles: userRolesList,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    console.log('Request DTO ', dto);
    const email = dto.email.trim().toLowerCase();
    console.log('Email', email);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    console.log('User: ', user);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );
    console.log('Password Valid', passwordValid);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    console.log('Before updating the user');
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

  private async generateReferralCode() {
    let code: string;

    do {
      code = 'XF' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const existing = await db.query.users.findFirst({
        where: eq(users.referralCode, code),
      });

      if (!existing) {
        return code;
      }
    } while (true);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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
}
