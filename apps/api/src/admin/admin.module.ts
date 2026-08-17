import { Module } from '@nestjs/common';
import { WalletService } from 'src/wallet/wallet.service';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminKycController } from './controllers/admin-kyc.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminWalletsController } from './controllers/admin-wallets.controller';
import { AdminKycService } from './services/admin-kyc.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminWalletsService } from './services/admin-wallets.service';
import { AdminWithdrawalsService } from './services/admin-withdrawals.service';
import { AuditService } from 'src/audit/audit.service';

@Module({
  controllers: [
    AdminAuditController,
    AdminKycController,
    AdminUsersController,
    AdminWalletsController,
    AdminWalletsController,
  ],
  providers: [
    WalletService,
    AuditService,
    AdminKycService,
    AdminUsersService,
    AdminWalletsService,
    AdminWithdrawalsService,
  ],
})
export class AdminModule {}
