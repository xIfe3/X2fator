import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, AuditService],
})
export class SupportModule {}
