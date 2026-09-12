import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { AdsService } from './ads.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { AdType } from './dto/create-ad.dto';

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  getAllAds() {
    return this.adsService.getAllAds();
  }

  @Get('pricing')
  getPricing() {
    return this.adsService.getPricing();
  }

  @Patch('pricing')
  updatePricing(@Body() body: Partial<Record<AdType, string>>) {
    return this.adsService.updatePricing(body);
  }

  @Patch(':id/review')
  reviewAd(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ) {
    return body.action === 'approve'
      ? this.adsService.approveAd(admin.id, id)
      : this.adsService.rejectAd(admin.id, id, body.reason);
  }
}
