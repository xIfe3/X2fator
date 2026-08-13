import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WalletService } from 'src/wallet/wallet.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WalletService],
})
export class PaymentsModule {}
