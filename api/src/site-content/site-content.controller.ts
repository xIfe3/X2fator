import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/required-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { AuditService } from '../audit/audit.service';
import { SiteContentService } from './site-content.service';

@Controller('site-content')
export class SiteContentController {
  constructor(
    private readonly siteContentService: SiteContentService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Get()
  async getAll() {
    return this.siteContentService.getAll();
  }

  @Patch('admin/:section')
  @UseGuards(PermissionsGuard)
  @RequirePermission('site_content.manage')
  async updateSection(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('section') section: string,
    @Body() body: { content: Record<string, unknown> },
  ) {
    const updated = await this.siteContentService.updateSection(section, body.content);

    await this.auditService.log({
      actorId: admin.id,
      action: 'update',
      entityType: 'system',
      description: `Updated "${section}" landing page content`,
      newValues: body.content,
    });

    return updated;
  }
}
