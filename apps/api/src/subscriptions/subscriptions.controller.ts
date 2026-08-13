import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { SubscriptionsService } from './subscriptions.service';
import { PurchasePlanDto } from './dto/purchase-plan.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/types/authenticated-request';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  async purchasePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PurchasePlanDto,
  ) {
    return this.subscriptionsService.purchasePlan(user.id, dto.planId);
  }

  @Get('active')
  async getActiveSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getActiveSubscription(user.id);
  }

  @Get()
  async getSubscriptions(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getUserSubscriptions(user.id);
  }

  @Delete(':id')
  async cancelSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.cancelSubscription(user.id, id);
  }
}
