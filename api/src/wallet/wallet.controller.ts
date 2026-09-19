import { Controller, Get, Query } from '@nestjs/common';

import { WalletService } from './wallet.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/types/authenticated-request';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallets(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getUserWallets(user.id);
  }

  @Get('balance')
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    const wallets = await this.walletService.getUserWallets(user.id);

    return {
      account: wallets.account.balance,
      task: wallets.task.balance,
      referral: wallets.referral.balance,
      total:
        Number(wallets.account.balance) +
        Number(wallets.task.balance) +
        Number(wallets.referral.balance),
    };
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type')
    type: 'account' | 'task' | 'referral' = 'account',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.walletService.getTransactions(
      user.id,
      type,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }
}
