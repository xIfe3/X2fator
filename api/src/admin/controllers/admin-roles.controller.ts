import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AdminRolesService } from '../services/admin-roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { SetRolePermissionsDto } from '../dto/set-role-permissions.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('roles.manage')
export class AdminRolesController {
  constructor(private readonly adminRolesService: AdminRolesService) {}

  @Get('permissions')
  async listPermissions() {
    return this.adminRolesService.listPermissions();
  }

  @Get()
  async listRoles() {
    return this.adminRolesService.listRoles();
  }

  @Post()
  async createRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.adminRolesService.createRole(admin.id, dto);
  }

  @Patch(':id/permissions')
  async setRolePermissions(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.adminRolesService.setRolePermissions(
      admin.id,
      id,
      dto.permissionNames,
    );
  }

  @Delete(':id')
  async deleteRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.adminRolesService.deleteRole(admin.id, id);
  }

  @Get('staff')
  async listStaff() {
    return this.adminRolesService.listStaff();
  }

  @Post('staff/:userId')
  async assignRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.adminRolesService.assignRole(admin.id, userId, dto.roleId);
  }

  @Delete('staff/:userId/:roleId')
  async unassignRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.adminRolesService.unassignRole(admin.id, userId, roleId);
  }
}
