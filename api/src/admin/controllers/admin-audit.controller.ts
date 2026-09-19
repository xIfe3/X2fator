import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';

import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit.read')
  async getAuditLogs() {
    return this.auditService.getLogs();
  }
}
