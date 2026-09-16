import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { SiteContentModule } from '../site-content/site-content.module';
import { BonusesController } from './bonuses.controller';
import { BonusesService } from './bonuses.service';

@Module({
  imports: [WalletModule, SiteContentModule],
  controllers: [BonusesController],
  providers: [BonusesService],
})
export class BonusesModule {}
