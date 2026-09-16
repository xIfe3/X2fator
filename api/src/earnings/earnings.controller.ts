import { Controller, Get, Param } from '@nestjs/common';

import { EarningsService } from './earnings.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get()
  async getMyEarnings(@CurrentUser() user: AuthenticatedUser) {
    return this.earningsService.getMyEarnings(user.id);
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.earningsService.getEarningsSummary(user.id);
  }

  @Get('source/:source')
  async getBySource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('source')
    source: 'task' | 'referral' | 'bonus' | 'adjustment',
  ) {
    return this.earningsService.getEarningsBySource(user.id, source);
  }

  @Get(':id')
  async getMyEarning(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.earningsService.getMyEarning(user.id, id);
  }
}
