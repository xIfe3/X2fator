import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { AdminWithdrawalsService } from '../services/admin-withdrawals.service';

import { ReviewWithdrawalDto } from '../dto/review-withdrawal.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminWithdrawalsController {
  constructor(
    private readonly adminWithdrawalsService: AdminWithdrawalsService,
  ) {}

  @Get('pending')
  @RequirePermission('withdrawals.read')
  async getPendingWithdrawals() {
    return this.adminWithdrawalsService.getPendingWithdrawals();
  }

  @Get(':id')
  @RequirePermission('withdrawals.read')
  async getWithdrawal(@Param('id') id: string) {
    return this.adminWithdrawalsService.getWithdrawal(id);
  }

  @Patch(':id/reject')
  @RequirePermission('withdrawals.reject')
  async rejectWithdrawal(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') withdrawalId: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.adminWithdrawalsService.rejectWithdrawal(
      admin.id,
      withdrawalId,
      dto.note,
    );
  }
}
