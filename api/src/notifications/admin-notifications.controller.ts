import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('users/:userId')
  @RequirePermission('notifications.send')
  async sendToUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationsService.sendToUser(admin.id, userId, dto);
  }

  @Post('broadcast')
  @RequirePermission('notifications.send')
  async broadcast(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationsService.broadcast(admin.id, dto);
  }
}
