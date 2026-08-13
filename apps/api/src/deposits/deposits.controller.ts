import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { DepositsService } from './deposits.service';
import { CreateDepositDto } from './dto/create-deposit.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post()
  async createDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositsService.createDeposit(
      user.id,
      dto.amount,
      dto.provider,
    );
  }

  @Get()
  async getDeposits(@CurrentUser() user: AuthenticatedUser) {
    return this.depositsService.getUserDeposits(user.id);
  }

  @Get(':id')
  async getDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.depositsService.getDeposit(user.id, id);
  }
}
