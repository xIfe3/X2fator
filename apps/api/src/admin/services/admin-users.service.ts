import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { desc, eq } from 'drizzle-orm';

import { db, users, wallets, walletTransactions } from '@2xfactor/database';

import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly auditService: AuditService) {}

  async getUsers() {
    return db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });
  }

  async getUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserWalletDetails(userId: string) {
    const user = await this.getUser(userId);
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
        earnings:
          userWallets.find((wallet) => wallet.type === 'earnings') ?? null,
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

    return updatedUser;
  }

  async activateUser(adminId: string, userId: string) {
    const user = await this.getUser(userId);

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

    return updatedUser;
  }

  async blockUser(adminId: string, userId: string) {
    const user = await this.getUser(userId);

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

    return updatedUser;
  }
}
