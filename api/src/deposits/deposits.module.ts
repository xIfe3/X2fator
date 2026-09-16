import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { AdminDepositsController } from './admin-deposits.controller';
import { WalletService } from '../wallet/wallet.service';

@Module({
  controllers: [DepositsController, AdminDepositsController],
  providers: [DepositsService, WalletService],
})
export class DepositsModule {}
