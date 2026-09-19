import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { WalletService } from '../../wallet/wallet.service';

import { AuditService } from '../../audit/audit.service';

import { AdminUsersService } from './admin-users.service';
import { db, users, walletTransactions, wallets } from '../../database';

export interface LedgerFilters {
  walletType?: 'account' | 'task' | 'referral';
  transactionType?: string;
  direction?: 'credit' | 'debit';
  status?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminWalletsService {
  constructor(
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  /**
   * Site-wide wallet totals — the sum of every user's balance, broken
   * down by wallet type, plus a grand total across all three. Used for
   * the admin dashboard header/overview, distinct from any single
   * user's (including the acting admin's own) wallet balance.
   */
  async getPlatformTotals() {
    const rows = await db
      .select({
        type: wallets.type,
        total: sql<string>`coalesce(sum(${wallets.balance}), 0)::text`,
      })
      .from(wallets)
      .groupBy(wallets.type);

    const totals = { account: '0.00', task: '0.00', referral: '0.00' };
    for (const row of rows) {
      totals[row.type] = row.total;
    }

    const grandTotal = (
      Number(totals.account) +
      Number(totals.task) +
      Number(totals.referral)
    ).toFixed(2);

    return { ...totals, total: grandTotal };
  }

  /**
   * Most recent wallet activity across every user — for the admin
   * dashboard's "recent activity" feed.
   */
  async getRecentTransactions(limit = 10) {
    return db
      .select({
        id: walletTransactions.id,
        type: walletTransactions.type,
        direction: walletTransactions.direction,
        amount: walletTransactions.amount,
        description: walletTransactions.description,
        createdAt: walletTransactions.createdAt,
        walletType: wallets.type,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(walletTransactions)
      .innerJoin(wallets, eq(wallets.id, walletTransactions.walletId))
      .innerJoin(users, eq(users.id, wallets.userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  }

  /**
   * The full, filterable, paginated wallet ledger — every balance-
   * changing transaction across every user, with the acting user's
   * identity attached. This is the platform's financial audit trail,
   * distinct from the small "recent activity" strip on the dashboard.
   */
  async getLedger(filters: LedgerFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));

    const conditions = [
      filters.walletType ? eq(wallets.type, filters.walletType) : undefined,
      filters.transactionType
        ? eq(
            walletTransactions.type,
            filters.transactionType as (typeof walletTransactions.type.enumValues)[number],
          )
        : undefined,
      filters.direction
        ? eq(walletTransactions.direction, filters.direction)
        : undefined,
      filters.status
        ? eq(
            walletTransactions.status,
            filters.status as (typeof walletTransactions.status.enumValues)[number],
          )
        : undefined,
      filters.userId ? eq(users.id, filters.userId) : undefined,
      filters.from ? gte(walletTransactions.createdAt, new Date(filters.from)) : undefined,
      filters.to ? lte(walletTransactions.createdAt, new Date(filters.to)) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: walletTransactions.id,
        type: walletTransactions.type,
        direction: walletTransactions.direction,
        amount: walletTransactions.amount,
        balanceBefore: walletTransactions.balanceBefore,
        balanceAfter: walletTransactions.balanceAfter,
        reference: walletTransactions.reference,
        description: walletTransactions.description,
        status: walletTransactions.status,
        createdAt: walletTransactions.createdAt,
        walletType: wallets.type,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(walletTransactions)
      .innerJoin(wallets, eq(wallets.id, walletTransactions.walletId))
      .innerJoin(users, eq(users.id, wallets.userId));

    const countQuery = db
      .select({ total: count() })
      .from(walletTransactions)
      .innerJoin(wallets, eq(wallets.id, walletTransactions.walletId))
      .innerJoin(users, eq(users.id, wallets.userId));

    const [items, [{ total }]] = await Promise.all([
      (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(walletTransactions.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      where ? countQuery.where(where) : countQuery,
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async adjustWallet(
    adminId: string,
    userId: string,
    params: {
      walletType: 'account' | 'task' | 'referral';
      amount: string;
      direction: 'credit' | 'debit';
      description: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.adminUsersService.getUser(userId);

    const reference = `ADMIN_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;

    let wallet;

    if (params.direction === 'credit') {
      wallet = await this.walletService.credit({
        userId,
        walletType: params.walletType,
        amount: params.amount,
        type: 'adjustment',
        reference,
        description: params.description,
        metadata: params.metadata,
      });
    } else {
      wallet = await this.walletService.debit({
        userId,
        walletType: params.walletType,
        amount: params.amount,
        type: 'fee',
        reference,
        description: params.description,
        metadata: params.metadata,
      });
    }

    await this.auditService.log({
      actorId: adminId,
      action: 'adjust',
      entityType: 'wallet',
      description: `Admin wallet ${params.direction}`,
      newValues: {
        userId,
        walletType: params.walletType,
        amount: params.amount,
        direction: params.direction,
        reference,
      },
    });

    return wallet;
  }
}
