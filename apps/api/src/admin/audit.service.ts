import { Injectable } from '@nestjs/common';
import { type DbTransaction } from '../wallet/wallet.service';
import { auditLogs } from '@2xfactor/database';

@Injectable()
export class AuditService {
  async log(params: {
    actorId?: string;
    action:
      | 'create'
      | 'update'
      | 'delete'
      | 'approve'
      | 'reject'
      | 'suspend'
      | 'activate'
      | 'block'
      | 'login'
      | 'logout'
      | 'adjust';
    entityType:
      | 'user'
      | 'wallet'
      | 'transaction'
      | 'plan'
      | 'subscription'
      | 'task'
      | 'withdrawal'
      | 'deposit'
      | 'kyc'
      | 'payment'
      | 'utility'
      | 'ticket'
      | 'admin'
      | 'system';
    entityId?: string;
    description?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    tx?: DbTransaction;
  }) {
    const values = {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      oldValues: params.oldValues,
      newValues: params.newValues,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };

    if (params.tx) {
      const [log] = await params.tx
        .insert(auditLogs)
        .values(values)
        .returning();

      return log;
    }

    const [log] = await import('@2xfactor/database').then(({ db }) =>
      db.insert(auditLogs).values(values).returning(),
    );

    return log;
  }

  async getLogs(limit = 50) {
    const { db } = await import('@2xfactor/database');

    return db.query.auditLogs.findMany({
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
      limit,
    });
  }
}
