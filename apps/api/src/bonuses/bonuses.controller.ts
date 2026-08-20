import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { BonusesService } from './bonuses.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('bonuses')
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  @Get('admin/daily')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getAdminSettings() {
    return this.bonusesService.getAdminSettings();
  }

  @Patch('admin/daily')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateAdminSettings(@Body() body: { enabled?: boolean; amount?: string }) {
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
