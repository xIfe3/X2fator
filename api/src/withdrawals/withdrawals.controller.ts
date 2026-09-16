import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalSettingsService } from './withdrawal-settings.service';
import { FlutterwaveAccountsService } from './flutterwave-accounts.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';
import { VerifyAccountDto } from './dto/verify-account.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    private readonly withdrawalSettingsService: WithdrawalSettingsService,
    private readonly flutterwaveAccountsService: FlutterwaveAccountsService,
  ) {}

  @Public()
  @Get('settings')
  async getSettings() {
    return this.withdrawalSettingsService.get();
  }

  @Get('banks')
  async getBanks() {
    return this.flutterwaveAccountsService.listBanks();
  }

  @Post('verify-account')
  async verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.flutterwaveAccountsService.resolveAccount(
      dto.accountNumber,
      dto.bankCode,
    );
  }

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
