import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { AdminUsersService } from '../services/admin-users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ResetUserPasswordDto } from '../dto/reset-user-password.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @RequirePermission('users.read')
  async getUsers() {
    return this.adminUsersService.getUsers();
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
