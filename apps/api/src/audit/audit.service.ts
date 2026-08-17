import { Injectable } from '@nestjs/common';

import { auditLogs, db } from '@2xfactor/database';
import { type DbTransaction } from '../wallet/wallet.service';

export interface AuditLogParams {
  actorId?: string;

  action:
    | 'suspend'
    | 'activate'
    | 'block'
    | 'approve'
    | 'reject'
    | 'adjust'
    | 'create'
    | 'update'
    | 'delete';

  entityType:
    | 'user'
    | 'kyc'
    | 'withdrawal'
    | 'wallet'
    | 'plan'
    | 'task'
    | 'system';

  entityId?: string;

  description?: string;

  oldValues?: Record<string, unknown>;

  newValues?: Record<string, unknown>;

  ipAddress?: string;

  userAgent?: string;

  tx?: DbTransaction;
}

@Injectable()
export class AuditService {
  async log(params: AuditLogParams) {
    const { tx, ...values } = params;

    const executor = tx ?? db;

    const [auditLog] = await executor
      .insert(auditLogs)
      .values({
        actorId: values.actorId,
        action: values.action,
        entityType: values.entityType,
        entityId: values.entityId,
        description: values.description,
        oldValues: values.oldValues,
        newValues: values.newValues,
        ipAddress: values.ipAddress,
        userAgent: values.userAgent,
      })
      .returning();

    return auditLog;
  }

  async getLogs() {
    return db.query.auditLogs.findMany({
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
    });
  }
}
