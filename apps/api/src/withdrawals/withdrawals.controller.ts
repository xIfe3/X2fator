import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  async createWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalsService.createWithdrawal(user.id, dto);
  }

  @Get()
  async getMyWithdrawals(@CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.getMyWithdrawals(user.id);
  }

  @Get(':id')
  async getMyWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.withdrawalsService.getMyWithdrawal(user.id, id);
  }

  @Get('admin/all')
  async getAllWithdrawals() {
    return this.withdrawalsService.getAllWithdrawals();
  }

  @Patch('admin/:id/review')
  async reviewWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.withdrawalsService.reviewWithdrawal(id, user.id, dto);
  }
}
