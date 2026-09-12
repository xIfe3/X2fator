import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { DepositsService } from './deposits.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('admin/deposits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get()
  getDeposits() {
    return this.depositsService.getAllDeposits();
  }

  @Get('stats')
  getStats() {
    return this.depositsService.getAdminStats();
  }

  @Patch(':id/review')
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
