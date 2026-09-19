import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminWithdrawalsService } from '../services/admin-withdrawals.service';
import { WithdrawalSettingsService } from '../../withdrawals/withdrawal-settings.service';

import { ReviewWithdrawalDto } from '../dto/review-withdrawal.dto';
import { UpdateWithdrawalSettingsDto } from '../dto/update-withdrawal-settings.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminWithdrawalsController {
  constructor(
    private readonly adminWithdrawalsService: AdminWithdrawalsService,
    private readonly withdrawalSettingsService: WithdrawalSettingsService,
  ) {}

  @Get('settings')
  @RequirePermission('withdrawals.settings')
  async getSettings() {
    return this.withdrawalSettingsService.get();
  }

  @Patch('settings')
  @RequirePermission('withdrawals.settings')
  async updateSettings(@Body() dto: UpdateWithdrawalSettingsDto) {
    return this.withdrawalSettingsService.update(dto);
  }

  @Get('pending')
  @RequirePermission('withdrawals.read')
  async getPendingWithdrawals() {
    return this.adminWithdrawalsService.getPendingWithdrawals();
  }

  @Get('all')
  @RequirePermission('withdrawals.read')
  async getAllWithdrawals(@Query('status') status?: string) {
    const validStatuses = [
      'pending',
      'processing',
      'completed',
      'rejected',
      'cancelled',
    ];

    if (status && !validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status filter');
    }

    return this.adminWithdrawalsService.getAllWithdrawals(
      status as
        | 'pending'
        | 'processing'
        | 'completed'
        | 'rejected'
        | 'cancelled'
        | undefined,
    );
  }

  @Get('stats')
  @RequirePermission('withdrawals.read')
  async getStats() {
    return this.adminWithdrawalsService.getAdminStats();
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
