import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import { AdminWalletsService } from '../services/admin-wallets.service';

import { AdjustWalletDto } from '../dto/adjust-wallet.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminWalletsController {
  constructor(private readonly adminWalletsService: AdminWalletsService) {}

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
