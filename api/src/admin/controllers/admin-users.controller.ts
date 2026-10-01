import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { AdminUsersService } from '../services/admin-users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ResetUserPasswordDto } from '../dto/reset-user-password.dto';
import { ResetUserPinDto } from '../dto/reset-user-pin.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @RequirePermission('users.read')
  async getUsers() {
    return this.adminUsersService.getUsers();
  }

  @Post('admins')
  @RequirePermission('users.create_admin')
  async createAdmin(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateAdminDto,
  ) {
    return this.adminUsersService.createAdmin(admin.id, dto);
  }

  @Get(':id')
  @RequirePermission('users.read')
  async getUser(@Param('id') id: string) {
    return this.adminUsersService.getUser(id);
  }

  @Get(':id/wallets')
  @RequirePermission('users.read')
  async getUserWalletDetails(@Param('id') id: string) {
    return this.adminUsersService.getUserWalletDetails(id);
  }

  @Patch(':id')
  @RequirePermission('users.update')
  async updateUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminUsersService.updateUser(admin.id, userId, dto);
  }

  @Patch(':id/password')
  @RequirePermission('users.update')
  async resetUserPassword(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: ResetUserPasswordDto,
  ) {
    return this.adminUsersService.resetUserPassword(
      admin.id,
      userId,
      dto.password,
    );
  }

  @Patch(':id/withdrawal-pin/reset')
  @RequirePermission('users.update')
  async resetUserWithdrawalPin(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: ResetUserPinDto,
  ) {
    return this.adminUsersService.resetUserWithdrawalPin(
      admin.id,
      userId,
      dto.message,
    );
  }

  @Patch(':id/suspend')
  @RequirePermission('users.suspend')
  async suspendUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminUsersService.suspendUser(admin.id, userId);
  }

  @Patch(':id/activate')
  @RequirePermission('users.activate')
  async activateUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminUsersService.activateUser(admin.id, userId);
  }

  @Patch(':id/block')
  @RequirePermission('users.block')
  async blockUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminUsersService.blockUser(admin.id, userId);
  }
}
