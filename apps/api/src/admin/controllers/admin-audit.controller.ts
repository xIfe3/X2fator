import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';

import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit.read')
  async getAuditLogs() {
    return this.auditService.getLogs();
  }
}
