import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('documents')
  async submitDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
  ) {
    return this.kycService.submitDocument(user.id, dto);
  }

  @Get('status')
  async getKycStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getKycStatus(user.id);
  }

  @Get('documents')
  async getMyDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getMyDocuments(user.id);
  }

  @Get('documents/:id')
  async getMyDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.kycService.getMyDocument(user.id, id);
  }
}
