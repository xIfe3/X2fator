import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { WalletService } from 'src/wallet/wallet.service';
import { ReferralsService } from 'src/referrals/referrals.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, WalletService, ReferralsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
