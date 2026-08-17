import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { desc, eq } from 'drizzle-orm';

import { db, kycDocuments, users } from '@2xfactor/database';

import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AdminKycService {
  constructor(private readonly auditService: AuditService) {}

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
}
