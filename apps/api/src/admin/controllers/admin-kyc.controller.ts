import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { AdminKycService } from '../services/admin-kyc.service';

import { ReviewKycDto } from '../dto/review-kyc.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/kyc')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminKycController {
  constructor(private readonly adminKycService: AdminKycService) {}

  @Get('pending')
  @RequirePermission('kyc.read')
  async getPendingKyc() {
    return this.adminKycService.getPendingKyc();
  }

  @Patch(':id/approve')
  @RequirePermission('kyc.approve')
  async approveKyc(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') documentId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.adminKycService.approveKyc(
      admin.id,
      documentId,
      dto.reviewNote,
    );
  }

  @Patch(':id/reject')
  @RequirePermission('kyc.reject')
  async rejectKyc(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') documentId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.adminKycService.rejectKyc(admin.id, documentId, dto.reviewNote);
  }
}
