import { Module } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalSettingsService } from './withdrawal-settings.service';
import { FlutterwaveAccountsService } from './flutterwave-accounts.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [WithdrawalsController],
  providers: [
    WithdrawalsService,
    WithdrawalSettingsService,
    FlutterwaveAccountsService,
  ],
  exports: [WithdrawalSettingsService, WithdrawalsService],
})
export class WithdrawalsModule {}
