import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, AuditService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
