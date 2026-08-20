import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [PlansController],
  providers: [PlansService, AuditService],
})
export class PlansModule {}
