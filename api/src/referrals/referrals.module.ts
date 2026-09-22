import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';
import { WalletService } from 'src/wallet/wallet.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ReferralsController, AdminReferralsController],
  providers: [ReferralsService, WalletService],
})
export class ReferralsModule {}
