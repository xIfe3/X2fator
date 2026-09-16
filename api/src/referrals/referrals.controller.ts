import { Controller, Get } from '@nestjs/common';

import { ReferralsService } from './referrals.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from 'src/common/types/authenticated-request';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('me')
  async getMyReferralInfo(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getMyReferralInfo(user.id);
  }

  @Get()
  async getMyReferrals(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getMyReferrals(user.id);
  }

  @Get('earnings')
  async getMyReferralEarnings(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getMyReferralEarnings(user.id);
  }

  @Public()
  @Get('leaderboard')
  async getLeaderboard() {
    return this.referralsService.getLeaderboard();
  }
}
