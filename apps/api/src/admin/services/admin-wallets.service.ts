import { Injectable } from '@nestjs/common';

import { WalletService } from '../../wallet/wallet.service';

import { AuditService } from '../../audit/audit.service';

import { AdminUsersService } from './admin-users.service';

@Injectable()
export class AdminWalletsService {
  constructor(
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

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
