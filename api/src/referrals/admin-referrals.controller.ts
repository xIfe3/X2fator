import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ReferralsService } from './referrals.service';

import { RequirePermission } from '../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('admin/referrals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('referrals.read')
export class AdminReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('stats')
  async getStats() {
    return this.referralsService.getAdminStats();
  }

  @Get('all')
  async getAllReferrals() {
    return this.referralsService.getAllReferrals();
  }

  @Get('suspicious')
  async getSuspicious(@Query('threshold') threshold?: string) {
    return this.referralsService.getSuspiciousReferrals(
      threshold ? Number(threshold) : undefined,
    );
  }
}
