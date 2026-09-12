import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { AdsService } from './ads.service';
import { CreateAdDto } from './dto/create-ad.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('pricing')
  getPricing() {
    return this.adsService.getPricing();
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.adsService.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdDto) {
    return this.adsService.create(user.id, dto);
  }
}
