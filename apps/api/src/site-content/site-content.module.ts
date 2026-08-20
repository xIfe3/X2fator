import { Module } from '@nestjs/common';
import { SiteContentController } from './site-content.controller';
import { SiteContentService } from './site-content.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [SiteContentController],
  providers: [SiteContentService, AuditService],
  exports: [SiteContentService],
})
export class SiteContentModule {}
