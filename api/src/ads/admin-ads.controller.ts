import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { AdsService } from './ads.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/required-permission.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { AdType } from './dto/create-ad.dto';

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('ads.manage')
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

  @Get(':id')
  getAd(@Param('id') id: string) {
    return this.adsService.getAdWithDetails(id);
  }

  @Patch(':id/review')
  reviewAd(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: { action: 'approve' | 'reject'; reward?: string; reason?: string },
  ) {
    return body.action === 'approve'
      ? this.adsService.approveAd(admin.id, id, body.reward)
      : this.adsService.rejectAd(admin.id, id, body.reason);
  }
}
