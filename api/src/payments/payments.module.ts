import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WalletService } from 'src/wallet/wallet.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SubscriptionsModule, MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, WalletService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
