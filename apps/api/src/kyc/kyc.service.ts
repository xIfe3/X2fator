import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db, kycDocuments, users } from '@2xfactor/database';

@Injectable()
export class KycService {
  /**
   * Submit a KYC document.
   */
  async submitDocument(
    userId: string,
    params: {
      documentType:
        | 'national_id'
        | 'drivers_license'
        | 'passport'
        | 'voters_card';
      documentNumber?: string;
      documentUrl: string;
    },
  ) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingPending = await db.query.kycDocuments.findFirst({
      where: and(
        eq(kycDocuments.userId, userId),
        eq(kycDocuments.documentType, params.documentType),
        eq(kycDocuments.status, 'pending'),
      ),
    });

    if (existingPending) {
      throw new BadRequestException(
        'You already have a pending document of this type',
      );
    }

    const [document] = await db
      .insert(kycDocuments)
      .values({
        userId,
        documentType: params.documentType,
        documentNumber: params.documentNumber,
        documentUrl: params.documentUrl,
        status: 'pending',
      })
      .returning();

    return document;
  }

  /**
   * Get all KYC documents belonging to the user.
   */
  async getMyDocuments(userId: string) {
    return db.query.kycDocuments.findMany({
      where: eq(kycDocuments.userId, userId),
      orderBy: [desc(kycDocuments.createdAt)],
    });
  }

  /**
   * Get a specific KYC document belonging to the user.
   */
  async getMyDocument(userId: string, documentId: string) {
    const document = await db.query.kycDocuments.findFirst({
      where: and(
        eq(kycDocuments.id, documentId),
        eq(kycDocuments.userId, userId),
      ),
    });

    if (!document) {
      throw new NotFoundException('KYC document not found');
    }

    return document;
  }

  /**
   * Get the user's current KYC status.
   */
  async getKycStatus(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const documents = await db.query.kycDocuments.findMany({
      where: eq(kycDocuments.userId, userId),
      orderBy: [desc(kycDocuments.createdAt)],
    });

    return {
      status: user.kycStatus,
      documents,
    };
  }
}
