import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';

import { PaymentsService } from '../payments/payments.service';
import { WithdrawalsService } from '../withdrawals/withdrawals.service';

import { Public } from '../common/decorators/public.decorator';

interface FlutterwaveWebhookBody {
  event?: string;
  data?: {
    id?: number;
    tx_ref?: string;
    reference?: string;
    status?: string;
  };
}

/**
 * Flutterwave allows only one webhook URL per merchant account, so every
 * event type (charge completions, transfer completions, and anything
 * added later) lands here and gets routed by `event` to the service that
 * owns that flow. Each downstream handler still independently verifies
 * the `verif-hash` signature and ignores event types it doesn't own, so
 * this controller is just a dispatcher — it holds no business logic.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly withdrawalsService: WithdrawalsService,
  ) {}

  @Public()
  @Post('flutterwave')
  @HttpCode(200)
  async flutterwave(
    @Headers('verif-hash') signature: string | undefined,
    @Body() body: FlutterwaveWebhookBody,
  ) {
    if (body.event?.startsWith('transfer.')) {
      return this.withdrawalsService.handleTransferWebhook(signature, body);
    }

    return this.paymentsService.handleFlutterwaveWebhook(signature, body);
  }
}
