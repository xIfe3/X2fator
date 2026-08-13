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
      earnings: wallets.earnings.balance,
      total: Number(wallets.account.balance) + Number(wallets.earnings.balance),
    };
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type')
    type: 'account' | 'earnings' = 'account',
  ) {
    return this.walletService.getTransactions(user.id, type);
  }
}
