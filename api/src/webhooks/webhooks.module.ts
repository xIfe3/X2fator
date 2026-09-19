import { Module } from '@nestjs/common';

import { WebhooksController } from './webhooks.controller';
import { PaymentsModule } from '../payments/payments.module';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';

@Module({
  imports: [PaymentsModule, WithdrawalsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
