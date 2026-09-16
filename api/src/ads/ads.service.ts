import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { ads, db, tasks, users } from '../database';
import { WalletService } from '../wallet/wallet.service';
import { SiteContentService } from '../site-content/site-content.service';
import { AuditService } from '../audit/audit.service';
import { AD_TYPES, AdType, CreateAdDto } from './dto/create-ad.dto';

const DEFAULT_AD_PRICING: Record<AdType, string> = {
  app_download: '50.00',
  followers: '30.00',
  subscribers: '30.00',
  comments: '20.00',
  likes: '10.00',
};

@Injectable()
export class AdsService {
  constructor(
    private readonly walletService: WalletService,
    private readonly siteContentService: SiteContentService,
    private readonly auditService: AuditService,
  ) {}

  async getPricing() {
    const sections = await this.siteContentService.getAll();
    const configured = (sections.ad_pricing ?? {}) as Record<string, unknown>;

    const pricing = {} as Record<AdType, string>;
    for (const adType of AD_TYPES) {
      const value = configured[adType];
      pricing[adType] =
        typeof value === 'string' && Number(value) > 0
          ? Number(value).toFixed(2)
          : DEFAULT_AD_PRICING[adType];
    }
    return pricing;
  }

  async updatePricing(prices: Partial<Record<AdType, string>>) {
    const current = await this.getPricing();
    const next: Record<AdType, string> = { ...current };

    for (const adType of AD_TYPES) {
      const value = prices[adType];
      if (value === undefined) continue;

      if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) {
        throw new BadRequestException(
          `Price for "${adType}" must be greater than zero`,
        );
      }
      next[adType] = Number(value).toFixed(2);
    }

    await this.siteContentService.updateSection('ad_pricing', next);
    return next;
  }

  async listMine(userId: string) {
    return db.query.ads.findMany({
      where: eq(ads.userId, userId),
      orderBy: [desc(ads.createdAt)],
    });
  }

  async getAllAds() {
    return db.query.ads.findMany({
      orderBy: [desc(ads.createdAt)],
    });
  }

  async create(userId: string, dto: CreateAdDto) {
    const pricing = await this.getPricing();
    const pricePerUnit = pricing[dto.adType];
    const totalCost = (Number(pricePerUnit) * dto.quantity).toFixed(2);

    return db.transaction(async (tx) => {
      const reference = `AD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      await this.walletService.debit(
        {
          userId,
          walletType: 'account',
          amount: totalCost,
          type: 'fee',
          reference,
          description: `Ad campaign: ${dto.title}`,
        },
        tx,
      );

      const [ad] = await tx
        .insert(ads)
        .values({
          userId,
          adType: dto.adType,
          title: dto.title,
          description: dto.description,
          targetUrl: dto.targetUrl,
          budget: totalCost,
          quantity: dto.quantity,
          pricePerUnit,
          remainingSlots: dto.quantity,
          status: 'pending',
        })
        .returning();

      const [task] = await tx
        .insert(tasks)
        .values({
          title: dto.title,
          description: dto.description,
          reward: pricePerUnit,
          taskType: dto.adType,
          targetUrl: dto.targetUrl,
          status: 'inactive',
          adId: ad.id,
        })
        .returning();

      const [updatedAd] = await tx
        .update(ads)
        .set({ taskId: task.id, updatedAt: new Date() })
        .where(eq(ads.id, ad.id))
        .returning();

      return updatedAd;
    });
  }

  async approveAd(adminId: string, adId: string, reward?: string) {
    const ad = await this.getAd(adId);

    if (ad.status !== 'pending') {
      throw new BadRequestException('Only pending campaigns can be approved');
    }

    if (reward !== undefined) {
      if (!/^\d+(\.\d{1,2})?$/.test(reward) || Number(reward) <= 0) {
        throw new BadRequestException('Reward must be greater than zero');
      }
    }

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(ads)
        .set({
          status: 'active',
          ...(reward !== undefined ? { pricePerUnit: reward } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ads.id, adId))
        .returning();

      if (ad.taskId) {
        await tx
          .update(tasks)
          .set({
            status: 'active',
            ...(reward !== undefined ? { reward } : {}),
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, ad.taskId));
      }

      await this.auditService.log({
        actorId: adminId,
        action: 'approve',
        entityType: 'task',
        entityId: ad.taskId ?? adId,
        description: `Approved ad campaign "${ad.title}"`,
        oldValues: { status: ad.status, pricePerUnit: ad.pricePerUnit },
        newValues: {
          status: 'active',
          ...(reward !== undefined ? { pricePerUnit: reward } : {}),
        },
        tx,
      });

      return updated;
    });
  }

  async rejectAd(adminId: string, adId: string, reason?: string) {
    const ad = await this.getAd(adId);

    if (ad.status !== 'pending') {
      throw new BadRequestException('Only pending campaigns can be rejected');
    }

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(ads)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(eq(ads.id, adId))
        .returning();

      if (ad.taskId) {
        await tx
          .update(tasks)
          .set({ status: 'inactive', updatedAt: new Date() })
          .where(eq(tasks.id, ad.taskId));
      }

      // No work has happened yet — refund the escrowed budget in full.
      await this.walletService.credit(
        {
          userId: ad.userId,
          walletType: 'account',
          amount: ad.budget,
          type: 'refund',
          reference: `AD_REFUND_${ad.id}`,
          description: `Refund for rejected ad campaign "${ad.title}"`,
          metadata: { adId: ad.id, reason },
        },
        tx,
      );

      await this.auditService.log({
        actorId: adminId,
        action: 'reject',
        entityType: 'task',
        entityId: ad.taskId ?? adId,
        description: `Rejected ad campaign "${ad.title}"`,
        oldValues: { status: ad.status },
        newValues: { status: 'rejected', reason },
        tx,
      });

      return updated;
    });
  }

  async getAdWithDetails(adId: string) {
    const ad = await this.getAd(adId);
    const requester = await db.query.users.findFirst({
      where: eq(users.id, ad.userId),
    });

    return {
      ...ad,
      requester: requester
        ? {
            id: requester.id,
            name: `${requester.firstName} ${requester.lastName}`.trim(),
            email: requester.email,
          }
        : null,
    };
  }

  private async getAd(adId: string) {
    const ad = await db.query.ads.findFirst({ where: eq(ads.id, adId) });
    if (!ad) throw new NotFoundException('Ad campaign not found');
    return ad;
  }
}
