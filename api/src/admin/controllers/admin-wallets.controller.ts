import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AdminWalletsService } from '../services/admin-wallets.service';

import { AdjustWalletDto } from '../dto/adjust-wallet.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminWalletsController {
  constructor(private readonly adminWalletsService: AdminWalletsService) {}

  @Get('totals')
  @RequirePermission('users.read')
  async getPlatformTotals() {
    return this.adminWalletsService.getPlatformTotals();
  }

  @Get('recent-transactions')
  @RequirePermission('users.read')
  async getRecentTransactions(@Query('limit') limit?: string) {
    return this.adminWalletsService.getRecentTransactions(
      limit ? Number(limit) : undefined,
    );
  }

  @Get('ledger')
  @RequirePermission('users.read')
  async getLedger(
    @Query('walletType') walletType?: 'account' | 'task' | 'referral',
    @Query('transactionType') transactionType?: string,
    @Query('direction') direction?: 'credit' | 'debit',
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminWalletsService.getLedger({
      walletType,
      transactionType,
      direction,
      status,
      userId,
      from,
      to,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post(':userId/adjust')
  @RequirePermission('wallets.adjust')
  async adjustWallet(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AdjustWalletDto,
  ) {
    return this.adminWalletsService.adjustWallet(admin.id, userId, dto);
  }
}
