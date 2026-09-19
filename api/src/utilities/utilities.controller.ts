import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UtilitiesService } from './utilities.service';
import { PurchaseUtilityDto } from './dto/purchase-utility.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('utilities')
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  @Get('data-bundles/:provider')
  async listDataBundles(
    @Param('provider') provider: 'mtn' | 'airtel' | 'glo' | '9mobile',
  ) {
    return this.utilitiesService.listDataBundles(provider);
  }

  @Post('purchase')
  async purchase(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PurchaseUtilityDto,
  ) {
    return this.utilitiesService.purchase(user.id, dto);
  }

  @Get()
  async getMyPurchases(@CurrentUser() user: AuthenticatedUser) {
    return this.utilitiesService.getMyPurchases(user.id);
  }

  @Get(':id')
  async getMyPurchase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.utilitiesService.getMyPurchase(user.id, id);
  }

  @Get('reference/:reference')
  async getByReference(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
  ) {
    return this.utilitiesService.getByReference(user.id, reference);
  }
}
