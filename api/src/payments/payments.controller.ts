import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { PaymentsService } from './payments.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

// The Flutterwave webhook used to live here, but Flutterwave only
// accepts one webhook URL per merchant account — it now lives at the
// shared POST /webhooks/flutterwave (see WebhooksController), which
// dispatches to this service's handleFlutterwaveWebhook() by event type.
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize/:depositId')
  async initializePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('depositId') depositId: string,
  ) {
    return this.paymentsService.initializePayment(user.id, depositId);
  }

  @Get('verify/:reference')
  async verifyPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
  ) {
    return this.paymentsService.verifyPayment(user.id, reference);
  }

  @Patch('cancel/:reference')
  async cancelPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
  ) {
    return this.paymentsService.cancelPayment(user.id, reference);
  }

  @Get()
  async getPayments(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.getUserPayments(user.id);
  }

  @Get(':reference')
  async getPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
  ) {
    return this.paymentsService.getPaymentByReference(user.id, reference);
  }
}
