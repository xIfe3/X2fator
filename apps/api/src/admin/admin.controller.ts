import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { AdminService } from './admin.service';
import { AuditService } from './audit.service';

import { ReviewKycDto } from './dto/review-kyc.dto';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';
import { AdjustWalletDto } from './dto/adjust-wallet.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/suspend')
  async suspendUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminService.suspendUser(admin.id, userId);
  }

  @Patch('users/:id/activate')
  async activateUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminService.activateUser(admin.id, userId);
  }

  @Patch('users/:id/block')
  async blockUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminService.blockUser(admin.id, userId);
  }

  @Get('kyc/pending')
  async getPendingKyc() {
    return this.adminService.getPendingKyc();
  }

  @Patch('kyc/:id/approve')
  async approveKyc(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') documentId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.adminService.approveKyc(admin.id, documentId, dto.reviewNote);
  }

  @Patch('kyc/:id/reject')
  async rejectKyc(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') documentId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.adminService.rejectKyc(admin.id, documentId, dto.reviewNote);
  }

  @Get('withdrawals/pending')
  async getPendingWithdrawals() {
    return this.adminService.getPendingWithdrawals();
  }

  @Get('withdrawals/:id')
  async getWithdrawal(@Param('id') id: string) {
    return this.adminService.getWithdrawal(id);
  }

  @Patch('withdrawals/:id/reject')
  async rejectWithdrawal(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') withdrawalId: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.adminService.rejectWithdrawal(admin.id, withdrawalId, dto.note);
  }

  @Post('users/:id/wallet/adjust')
  async adjustWallet(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: AdjustWalletDto,
  ) {
    return this.adminService.adjustWallet(admin.id, userId, dto);
  }

  @Get('audit')
  async getAuditLogs() {
    return this.auditService.getLogs();
  }
}
