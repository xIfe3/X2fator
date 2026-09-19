import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { DepositsService } from './deposits.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/required-permission.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('admin/deposits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminDepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get()
  @RequirePermission('deposits.read')
  getDeposits() {
    return this.depositsService.getAllDeposits();
  }

  @Get('stats')
  @RequirePermission('deposits.read')
  getStats() {
    return this.depositsService.getAdminStats();
  }

  @Patch(':id/review')
  @RequirePermission('deposits.review')
  reviewDeposit(
    @CurrentUser() _admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: {
      action: 'approve' | 'reject';
      providerReference?: string;
      reason?: string;
    },
  ) {
    return this.depositsService.reviewDeposit(
      id,
      body.action,
      body.providerReference,
      body.reason,
    );
  }
}
