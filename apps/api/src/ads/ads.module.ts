import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdminAdsController } from './admin-ads.controller';
import { AdsService } from './ads.service';
import { WalletModule } from '../wallet/wallet.module';
import { SiteContentModule } from '../site-content/site-content.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [WalletModule, SiteContentModule, AuditModule],
  controllers: [AdsController, AdminAdsController],
  providers: [AdsService],
})
export class AdsModule {}
