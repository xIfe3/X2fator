import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db, payments, users } from '../../database';

export interface PaymentFilters {
  provider?: 'flutterwave' | 'manual' | 'mock';
  status?:
    | 'pending'
    | 'processing'
    | 'successful'
    | 'failed'
    | 'cancelled'
    | 'refunded';
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Payment gateway configuration status — never returns the actual
   * secret values, only whether each is set, so this is safe to expose
   * to any admin with `payments.read`.
   */
  getGatewayStatus() {
    const secretKey = this.configService.get<string>('flutterwave.secretKey');
    const publicKey = this.configService.get<string>('flutterwave.publicKey');
    const secretHash = this.configService.get<string>('flutterwave.secretHash');
    const callbackUrl = this.configService.get<string>('flutterwave.callbackUrl');
    const baseUrl = this.configService.get<string>('flutterwave.baseUrl');

    return {
      provider: 'flutterwave',
      baseUrl,
      callbackUrl: callbackUrl ?? null,
      secretKeyConfigured: !!secretKey,
      publicKeyConfigured: !!publicKey,
      webhookSecretConfigured: !!secretHash,
      fullyConfigured: !!(secretKey && publicKey && secretHash && callbackUrl),
    };
  }

  /**
   * Transaction counts and volume by status — the gateway health
   * summary for the admin dashboard.
   */
  async getStats() {
    const byStatus = await db
      .select({
        status: payments.status,
        count: count(),
        totalAmount: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
      })
      .from(payments)
      .groupBy(payments.status);

    const counts = {
      pending: 0,
      processing: 0,
      successful: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
    };
    let successfulVolume = '0.00';

    for (const row of byStatus) {
      counts[row.status] = row.count;
      if (row.status === 'successful') successfulVolume = row.totalAmount;
    }

    return {
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      successfulVolume,
    };
  }

  /**
   * The full, filterable, paginated payment/webhook transaction log —
   * every gateway transaction across every user, including the raw
   * provider response captured at verification/webhook time.
   */
  async getAll(filters: PaymentFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));

    const conditions = [
      filters.provider ? eq(payments.provider, filters.provider) : undefined,
      filters.status ? eq(payments.status, filters.status) : undefined,
      filters.userId ? eq(payments.userId, filters.userId) : undefined,
      filters.from ? gte(payments.createdAt, new Date(filters.from)) : undefined,
      filters.to ? lte(payments.createdAt, new Date(filters.to)) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: payments.id,
        provider: payments.provider,
        reference: payments.reference,
        providerReference: payments.providerReference,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId));

    const countQuery = db
      .select({ total: count() })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId));

    const [items, [{ total }]] = await Promise.all([
      (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(payments.createdAt))
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

  async getOne(id: string) {
    const row = await db
      .select({
        id: payments.id,
        provider: payments.provider,
        reference: payments.reference,
        providerReference: payments.providerReference,
        amount: payments.amount,
        status: payments.status,
        rawResponse: payments.rawResponse,
        metadata: payments.metadata,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .where(eq(payments.id, id))
      .limit(1);

    if (!row[0]) {
      throw new NotFoundException('Payment not found');
    }

    return row[0];
  }
}
