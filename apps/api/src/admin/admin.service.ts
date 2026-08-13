import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { db, kycDocuments, users, withdrawals } from '@2xfactor/database';

import { WalletService } from '../wallet/wallet.service';
import { AuditService } from './audit.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) {}

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

  async getPendingKyc() {
    return db.query.kycDocuments.findMany({
      where: eq(kycDocuments.status, 'pending'),
      orderBy: [desc(kycDocuments.createdAt)],
    });
  }

  async approveKyc(adminId: string, documentId: string, reviewNote?: string) {
    const document = await db.query.kycDocuments.findFirst({
      where: eq(kycDocuments.id, documentId),
    });

    if (!document) {
      throw new NotFoundException('KYC document not found');
    }

    if (document.status !== 'pending') {
      throw new BadRequestException(
        'Only pending KYC documents can be approved',
      );
    }

    return db.transaction(async (tx) => {
      const [updatedDocument] = await tx
        .update(kycDocuments)
        .set({
          status: 'approved',
          reviewNote,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(kycDocuments.id, documentId))
        .returning();

      await tx
        .update(users)
        .set({
          kycStatus: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(users.id, document.userId));

      await this.auditService.log({
        actorId: adminId,
        action: 'approve',
        entityType: 'kyc',
        entityId: documentId,
        description: 'Approved KYC document',
        oldValues: {
          status: document.status,
        },
        newValues: {
          status: 'approved',
          reviewNote,
        },
        tx,
      });

      return updatedDocument;
    });
  }

  async rejectKyc(adminId: string, documentId: string, reviewNote?: string) {
    const document = await db.query.kycDocuments.findFirst({
      where: eq(kycDocuments.id, documentId),
    });

    if (!document) {
      throw new NotFoundException('KYC document not found');
    }

    if (document.status !== 'pending') {
      throw new BadRequestException(
        'Only pending KYC documents can be rejected',
      );
    }

    return db.transaction(async (tx) => {
      const [updatedDocument] = await tx
        .update(kycDocuments)
        .set({
          status: 'rejected',
          reviewNote,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(kycDocuments.id, documentId))
        .returning();

      await tx
        .update(users)
        .set({
          kycStatus: 'rejected',
          updatedAt: new Date(),
        })
        .where(eq(users.id, document.userId));

      await this.auditService.log({
        actorId: adminId,
        action: 'reject',
        entityType: 'kyc',
        entityId: documentId,
        description: 'Rejected KYC document',
        oldValues: {
          status: document.status,
        },
        newValues: {
          status: 'rejected',
          reviewNote,
        },
        tx,
      });

      return updatedDocument;
    });
  }

  async getPendingWithdrawals() {
    return db.query.withdrawals.findMany({
      where: eq(withdrawals.status, 'pending'),
      orderBy: [desc(withdrawals.createdAt)],
    });
  }

  async getWithdrawal(withdrawalId: string) {
    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawalId),
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

  async rejectWithdrawal(adminId: string, withdrawalId: string, note?: string) {
    const withdrawal = await this.getWithdrawal(withdrawalId);

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      throw new BadRequestException(
        'Withdrawal cannot be rejected in its current state',
      );
    }

    const [updatedWithdrawal] = await db
      .update(withdrawals)
      .set({
        status: 'rejected',
        rejectionReason: note,
        processedBy: adminId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'reject',
      entityType: 'withdrawal',
      entityId: withdrawalId,
      description: 'Rejected withdrawal',
      oldValues: {
        status: withdrawal.status,
      },
      newValues: {
        status: 'rejected',
        rejectionReason: note,
      },
    });

    return updatedWithdrawal;
  }

  async adjustWallet(
    adminId: string,
    userId: string,
    params: {
      walletType: 'account' | 'earnings';
      amount: string;
      direction: 'credit' | 'debit';
      description: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.getUser(userId);

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
