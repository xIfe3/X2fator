import { Injectable } from '@nestjs/common';

import {
  auditLogs,
  db,
  plans,
  tasks,
  users,
  withdrawals,
} from '../database';
import { eq } from 'drizzle-orm';
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
    | 'reset_password'
    | 'delete';

  entityType:
    | 'user'
    | 'withdrawal'
    | 'wallet'
    | 'plan'
    | 'subscription'
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
    const logs = await db.query.auditLogs.findMany({
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
    });

    return Promise.all(
      logs.map(async (log) => {
        const actor = log.actorId
          ? await db.query.users.findFirst({ where: eq(users.id, log.actorId) })
          : null;
        const entity = await this.getEntityDetails(
          log.entityType,
          log.entityId,
        );

        return {
          ...log,
          actor: actor
            ? {
                id: actor.id,
                name: `${actor.firstName} ${actor.lastName}`.trim(),
                email: actor.email,
              }
            : null,
          entity,
        };
      }),
    );
  }

  private async getEntityDetails(entityType: string, entityId?: string | null) {
    if (!entityId) return null;

    if (entityType === 'user') {
      const user = await db.query.users.findFirst({
        where: eq(users.id, entityId),
      });
      return user
        ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            status: user.status,
          }
        : null;
    }
    if (entityType === 'plan') {
      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, entityId),
      });
      return plan
        ? {
            id: plan.id,
            name: plan.name,
            price: plan.price,
            status: plan.status,
          }
        : null;
    }
    if (entityType === 'task') {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, entityId),
      });
      return task
        ? {
            id: task.id,
            name: task.title,
            reward: task.reward,
            status: task.status,
          }
        : null;
    }
    if (entityType === 'withdrawal') {
      const withdrawal = await db.query.withdrawals.findFirst({
        where: eq(withdrawals.id, entityId),
      });
      return withdrawal
        ? {
            id: withdrawal.id,
            name: withdrawal.accountName,
            amount: withdrawal.amount,
            status: withdrawal.status,
            reference: withdrawal.transactionReference,
          }
        : null;
    }
    return { id: entityId };
  }
}
