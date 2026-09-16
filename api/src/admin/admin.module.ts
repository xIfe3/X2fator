import { Module } from '@nestjs/common';
import { WalletService } from 'src/wallet/wallet.service';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminWalletsController } from './controllers/admin-wallets.controller';
import { AdminWithdrawalsController } from './controllers/admin-withdrawals.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminWalletsService } from './services/admin-wallets.service';
import { AdminWithdrawalsService } from './services/admin-withdrawals.service';
import { AuditService } from 'src/audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';

@Module({
  imports: [WithdrawalsModule],
  controllers: [
    AdminAuditController,
    AdminUsersController,
    AdminWalletsController,
    AdminWithdrawalsController,
  ],
  providers: [
    WalletService,
    AuditService,
    AdminUsersService,
    PasswordService,
    AdminWalletsService,
    AdminWithdrawalsService,
  ],
})
export class AdminModule {}
