import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';

import { PaymentsService } from './payments.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('webhook/flutterwave')
  @HttpCode(200)
  async flutterwaveWebhook(
    @Headers('verif-hash') signature: string | undefined,
    @Body() body: { data?: { tx_ref?: string; status?: string } },
  ) {
    return this.paymentsService.handleFlutterwaveWebhook(signature, body);
  }

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
