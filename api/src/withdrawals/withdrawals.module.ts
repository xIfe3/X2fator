import { Module } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalSettingsService } from './withdrawal-settings.service';
import { FlutterwaveAccountsService } from './flutterwave-accounts.service';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [WithdrawalsController],
  providers: [
    WithdrawalsService,
    WithdrawalSettingsService,
    FlutterwaveAccountsService,
  ],
  exports: [WithdrawalSettingsService, WithdrawalsService],
})
export class WithdrawalsModule {}
