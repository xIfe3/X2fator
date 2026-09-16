import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { desc, eq } from 'drizzle-orm';

import { db, users, wallets, walletTransactions } from '../../database';

import { AuditService } from '../../audit/audit.service';
import { PasswordService } from '../../auth/password.service';
import type { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
  ) {}

  async getUsers() {
    const rows = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });
    return rows.map((user) => this.sanitizeUser(user));
  }

  async getUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateUser(adminId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.getUserRecord(userId);
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    const values: Partial<typeof users.$inferInsert> = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== user.email) {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (existing) throw new BadRequestException('Email is already in use');
        values.email = email;
        oldValues.email = user.email;
        newValues.email = email;
      }
    }
    for (const field of ['firstName', 'lastName', 'phone', 'gender'] as const) {
      if (dto[field] !== undefined && dto[field] !== user[field]) {
        values[field] = dto[field] as never;
        oldValues[field] = user[field];
        newValues[field] = dto[field];
      }
    }

    if (Object.keys(values).length === 0) return this.sanitizeUser(user);
    values.updatedAt = new Date();
    const [updated] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, userId))
      .returning();
    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'user',
      entityId: userId,
      description: `Updated user ${user.email}`,
      oldValues,
      newValues,
    });
    return this.sanitizeUser(updated);
  }

  async resetUserPassword(adminId: string, userId: string, password: string) {
    const user = await this.getUserRecord(userId);
    const passwordHash = await this.passwordService.hash(password);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await this.auditService.log({
      actorId: adminId,
      action: 'reset_password',
      entityType: 'user',
      entityId: userId,
      description: `Reset password for user ${user.email}`,
    });
    return { message: 'User password has been reset.' };
  }

  private async getUserRecord(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private sanitizeUser(user: typeof users.$inferSelect) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async getUserWalletDetails(userId: string) {
    const user = await this.getUserRecord(userId);
    const userWallets = await db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
    });

    const transactions = await db
      .select({
        id: walletTransactions.id,
        walletId: walletTransactions.walletId,
        walletType: wallets.type,
        type: walletTransactions.type,
        direction: walletTransactions.direction,
        amount: walletTransactions.amount,
        balanceBefore: walletTransactions.balanceBefore,
        balanceAfter: walletTransactions.balanceAfter,
        reference: walletTransactions.reference,
        description: walletTransactions.description,
        status: walletTransactions.status,
        createdAt: walletTransactions.createdAt,
      })
      .from(walletTransactions)
      .innerJoin(wallets, eq(walletTransactions.walletId, wallets.id))
      .where(eq(wallets.userId, userId))
      .orderBy(desc(walletTransactions.createdAt));

    return {
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
      },
      wallets: {
        account:
          userWallets.find((wallet) => wallet.type === 'account') ?? null,
        task: userWallets.find((wallet) => wallet.type === 'task') ?? null,
        referral:
          userWallets.find((wallet) => wallet.type === 'referral') ?? null,
      },
      transactions,
    };
  }

  async suspendUser(adminId: string, userId: string) {
    const user = await this.getUser(userId);

    if (user.status === 'suspended') {
      throw new BadRequestException('User is already suspended');
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'suspend',
      entityType: 'user',
      entityId: userId,
      description: `Suspended user ${user.email}`,
      oldValues: {
        status: user.status,
      },
      newValues: {
        status: 'suspended',
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async activateUser(adminId: string, userId: string) {
    const user = await this.getUserRecord(userId);

    if (user.status === 'active') {
      throw new BadRequestException('User is already active');
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'activate',
      entityType: 'user',
      entityId: userId,
      description: `Activated user ${user.email}`,
      oldValues: {
        status: user.status,
      },
      newValues: {
        status: 'active',
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async blockUser(adminId: string, userId: string) {
    const user = await this.getUserRecord(userId);

    if (user.status === 'blocked') {
      throw new BadRequestException('User is already blocked');
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        status: 'blocked',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'block',
      entityType: 'user',
      entityId: userId,
      description: `Blocked user ${user.email}`,
      oldValues: {
        status: user.status,
      },
      newValues: {
        status: 'blocked',
      },
    });

    return this.sanitizeUser(updatedUser);
  }
}
