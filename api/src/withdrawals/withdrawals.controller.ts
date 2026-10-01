import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalSettingsService } from './withdrawal-settings.service';
import { FlutterwaveAccountsService } from './flutterwave-accounts.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { Throttle } from '@nestjs/throttler';

import { SetWithdrawalPinDto } from './dto/set-withdrawal-pin.dto';
import { ResetWithdrawalPinDto } from './dto/reset-withdrawal-pin.dto';
import { AddBankAccountDto } from './dto/add-bank-account.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/required-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
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

  @Get('task-minimum')
  async getTaskMinimum(@CurrentUser() user: AuthenticatedUser) {
    const minimum = await this.withdrawalsService.getTaskMinimumWithdrawal(
      user.id,
    );
    return { minimum: minimum.toFixed(2) };
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

  @Get('pin/status')
  async getPinStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.getPinStatus(user.id);
  }

  @Post('pin')
  async setPin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetWithdrawalPinDto,
  ) {
    return this.withdrawalsService.setPin(user.id, dto.pin);
  }

  // Throttled to slow down password guessing.
  @Post('pin/reset')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResetWithdrawalPinDto,
  ) {
    return this.withdrawalsService.resetPin(user.id, dto.password, dto.newPin);
  }

  @Get('accounts')
  async listBankAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.listBankAccounts(user.id);
  }

  @Post('accounts')
  async addBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddBankAccountDto,
  ) {
    return this.withdrawalsService.addBankAccount(user.id, dto);
  }

  @Delete('accounts/:id')
  async deleteBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.withdrawalsService.deleteBankAccount(user.id, id);
  }

  @Patch('accounts/:id/default')
  async setDefaultBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.withdrawalsService.setDefaultBankAccount(user.id, id);
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('withdrawals.read')
  async getAllWithdrawals() {
    return this.withdrawalsService.getAllWithdrawals();
  }

  @Patch('admin/:id/review')
  @UseGuards(PermissionsGuard)
  @RequirePermission('withdrawals.approve')
  async reviewWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.withdrawalsService.reviewWithdrawal(id, user.id, dto);
  }

  @Patch('admin/:id/reconcile')
  @UseGuards(PermissionsGuard)
  @RequirePermission('withdrawals.approve')
  async reconcileWithdrawal(@Param('id') id: string) {
    return this.withdrawalsService.reconcileWithdrawal(id);
  }
}
