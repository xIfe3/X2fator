import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { and, count, desc, eq, isNotNull, ne, sql } from 'drizzle-orm';

import {
  db,
  planSubscriptions,
  plans,
  roles,
  userRoles,
  users,
  wallets,
  walletTransactions,
} from '../../database';

import { AuditService } from '../../audit/audit.service';
import { PasswordService } from '../../auth/password.service';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { CreateAdminDto } from '../dto/create-admin.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Creates a new admin account. Requires the CALLING admin's own current
   * password as a re-authorization step — protects against someone who
   * has hijacked a logged-in admin session (but not the password) from
   * minting themselves a fresh admin account.
   */
  async createAdmin(actingAdminId: string, dto: CreateAdminDto) {
    const actingAdmin = await this.getUserRecord(actingAdminId);

    const passwordValid = await this.passwordService.compare(
      dto.currentAdminPassword,
      actingAdmin.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Your password is incorrect');
    }

    const email = dto.email.trim().toLowerCase();

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const adminRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'admin'),
    });
    const userRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'user'),
    });

    if (!adminRole || !userRole) {
      throw new BadRequestException('Admin/user roles are not configured');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const username = await this.generateUsername(email);

    const newAdmin = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          username,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          referralCode: username,
          status: 'active',
          emailVerified: true,
        })
        .returning();

      await tx.insert(userRoles).values([
        { userId: created.id, roleId: adminRole.id },
        { userId: created.id, roleId: userRole.id },
      ]);

      await tx.insert(wallets).values([
        { userId: created.id, type: 'account', balance: '0', status: 'active' },
        { userId: created.id, type: 'task', balance: '0', status: 'active' },
        { userId: created.id, type: 'referral', balance: '0', status: 'active' },
      ]);

      return created;
    });

    await this.auditService.log({
      actorId: actingAdminId,
      action: 'create',
      entityType: 'user',
      entityId: newAdmin.id,
      description: `Created admin account ${newAdmin.email}`,
    });

    return this.sanitizeUser(newAdmin);
  }

  /**
   * Derives a unique username/referral-code slug from an email for
   * admin-created accounts, which don't collect a username from a form
   * the way self-registration does.
   */
  private async generateUsername(email: string) {
    const emailSlug = email.split('@')[0].toLowerCase();
    let code = emailSlug;

    let existing = await db.query.users.findFirst({
      where: eq(users.username, code),
    });

    if (existing) {
      let counter = 1;
      do {
        code = `${emailSlug}${counter}`;
        existing = await db.query.users.findFirst({
          where: eq(users.username, code),
        });
        counter++;
      } while (existing && counter < 1000);
    }

    return code;
  }

  async getUsers() {
    // `pending` rows are signups that never paid — not real accounts yet,
    // so they're kept out of the admin users list.
    const rows = await db.query.users.findMany({
      where: ne(users.status, 'pending'),
      orderBy: [desc(users.createdAt)],
    });

    // One grouped query per related table rather than per user, so the
    // list stays a fixed handful of queries however many users exist.
    const [roleRows, balanceRows, planRows, referralRows] = await Promise.all([
      db
        .select({ userId: userRoles.userId, name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id)),
      db
        .select({
          userId: wallets.userId,
          total: sql<string>`coalesce(sum(${wallets.balance}), 0)`,
        })
        .from(wallets)
        .groupBy(wallets.userId),
      db
        .select({ userId: planSubscriptions.userId, planName: plans.name })
        .from(planSubscriptions)
        .innerJoin(plans, eq(planSubscriptions.planId, plans.id))
        .where(eq(planSubscriptions.status, 'active'))
        .orderBy(desc(plans.rank)),
      db
        .select({ referrerId: users.referredById, total: count() })
        .from(users)
        .where(and(isNotNull(users.referredById), ne(users.status, 'pending')))
        .groupBy(users.referredById),
    ]);

    const rolesByUser = new Map<string, string[]>();
    for (const row of roleRows) {
      const list = rolesByUser.get(row.userId) ?? [];
      list.push(row.name);
      rolesByUser.set(row.userId, list);
    }
    const balanceByUser = new Map(balanceRows.map((r) => [r.userId, r.total]));
    // Rows are ordered by plan rank, so the first one seen is the best tier.
    const planByUser = new Map<string, string>();
    for (const row of planRows) {
      if (!planByUser.has(row.userId)) planByUser.set(row.userId, row.planName);
    }
    const referralsByUser = new Map(
      referralRows.map((r) => [r.referrerId as string, r.total]),
    );
    const usernameById = new Map(rows.map((u) => [u.id, u.username]));

    return rows.map((user) => ({
      ...this.sanitizeUser(user),
      roles: rolesByUser.get(user.id) ?? [],
      totalBalance: balanceByUser.get(user.id) ?? '0',
      activePlan: planByUser.get(user.id) ?? null,
      referralCount: referralsByUser.get(user.id) ?? 0,
      referredByUsername: user.referredById
        ? (usernameById.get(user.referredById) ?? null)
        : null,
    }));
  }

  async getUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [roleRows, userWallets, subscriptions, referredBy, referralRows] =
      await Promise.all([
        db
          .select({ name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, userId)),
        db.query.wallets.findMany({ where: eq(wallets.userId, userId) }),
        db
          .select({
            id: planSubscriptions.id,
            planName: plans.name,
            amountPaid: planSubscriptions.amountPaid,
            dailyReward: planSubscriptions.dailyReward,
            dailyTaskLimit: planSubscriptions.dailyTaskLimit,
            status: planSubscriptions.status,
            startsAt: planSubscriptions.startsAt,
            createdAt: planSubscriptions.createdAt,
          })
          .from(planSubscriptions)
          .innerJoin(plans, eq(planSubscriptions.planId, plans.id))
          .where(eq(planSubscriptions.userId, userId))
          .orderBy(desc(planSubscriptions.createdAt)),
        user.referredById
          ? db.query.users.findFirst({
              where: eq(users.id, user.referredById),
              columns: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            })
          : Promise.resolve(null),
        db
          .select({
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            status: users.status,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(
            and(eq(users.referredById, userId), ne(users.status, 'pending')),
          )
          .orderBy(desc(users.createdAt)),
      ]);

    const walletOf = (type: 'account' | 'task' | 'referral') =>
      userWallets.find((wallet) => wallet.type === type) ?? null;

    return {
      ...this.sanitizeUser(user),
      roles: roleRows.map((r) => r.name),
      wallets: {
        account: walletOf('account'),
        task: walletOf('task'),
        referral: walletOf('referral'),
      },
      totalBalance: userWallets
        .reduce((sum, wallet) => sum + Number(wallet.balance), 0)
        .toFixed(2),
      activePlan:
        subscriptions.find((s) => s.status === 'active')?.planName ?? null,
      subscriptions,
      referredBy: referredBy ?? null,
      referredByUsername: referredBy?.username ?? null,
      referralCount: referralRows.length,
      recentReferrals: referralRows.slice(0, 5),
    };
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
    const { passwordHash, withdrawalPinHash, ...safeUser } = user;
    return { ...safeUser, hasWithdrawalPin: !!withdrawalPinHash };
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
    const user = await this.getUserRecord(userId);

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
