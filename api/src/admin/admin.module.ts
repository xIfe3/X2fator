import { Module } from '@nestjs/common';
import { WalletService } from 'src/wallet/wallet.service';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminWalletsController } from './controllers/admin-wallets.controller';
import { AdminWithdrawalsController } from './controllers/admin-withdrawals.controller';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { AdminFlutterwaveController } from './controllers/admin-flutterwave.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminWalletsService } from './services/admin-wallets.service';
import { AdminWithdrawalsService } from './services/admin-withdrawals.service';
import { AdminRolesService } from './services/admin-roles.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AuditService } from 'src/audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [WithdrawalsModule, MailModule],
  controllers: [
    AdminAuditController,
    AdminUsersController,
    AdminWalletsController,
    AdminWithdrawalsController,
    AdminRolesController,
    AdminSubscriptionsController,
    AdminPaymentsController,
    AdminFlutterwaveController,
  ],
  providers: [
    WalletService,
    AuditService,
    AdminUsersService,
    PasswordService,
    AdminWalletsService,
    AdminWithdrawalsService,
    AdminRolesService,
    AdminSubscriptionsService,
    AdminPaymentsService,
  ],
})
export class AdminModule {}
