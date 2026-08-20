import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
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
  @UseGuards(RolesGuard)
  @Roles('admin')
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
      entityId: section,
      description: `Updated "${section}" landing page content`,
      newValues: body.content,
    });

    return updated;
  }
}
