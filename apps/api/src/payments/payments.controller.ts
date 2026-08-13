import { Controller, Get, Param, Post } from '@nestjs/common';

import { PaymentsService } from './payments.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

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

  @Get(':reference')
  async getPayment(@Param('reference') reference: string) {
    return this.paymentsService.getPaymentByReference(reference);
  }
}
