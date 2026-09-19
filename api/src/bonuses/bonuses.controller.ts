import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { BonusesService } from './bonuses.service';
import { RequirePermission } from '../common/decorators/required-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('bonuses')
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  @Get('admin/daily')
  @UseGuards(PermissionsGuard)
  @RequirePermission('bonuses.manage')
  getAdminSettings() {
    return this.bonusesService.getAdminSettings();
  }

  @Get('admin/stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('bonuses.manage')
  getAdminStats() {
    return this.bonusesService.getAdminStats();
  }

  @Patch('admin/daily')
  @UseGuards(PermissionsGuard)
  @RequirePermission('bonuses.manage')
  updateAdminSettings(
    @Body()
    body: { enabled?: boolean; amount?: string; milestoneAmount?: string },
  ) {
    return this.bonusesService.updateAdminSettings(body);
  }

  @Get('daily')
  getDailyStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.bonusesService.getDailyStatus(user.id);
  }

  @Post('daily/claim')
  claimDailyBonus(@CurrentUser() user: AuthenticatedUser) {
    return this.bonusesService.claimDailyBonus(user.id);
  }
}
