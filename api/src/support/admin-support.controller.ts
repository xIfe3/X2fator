import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { SupportService } from './support.service';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { SetPriorityDto } from './dto/set-priority.dto';
import { AddMessageDto } from './dto/add-message.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('admin/support')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @RequirePermission('support.read')
  async getAllTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.supportService.getAllTickets({ status, priority });
  }

  @Get('tickets/:id')
  @RequirePermission('support.read')
  async getTicket(@Param('id') id: string) {
    return this.supportService.getTicketForAdmin(id);
  }

  @Patch('tickets/:id/assign')
  @RequirePermission('support.manage')
  async assignTicket(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assignTicket(admin.id, id, dto.staffId ?? null);
  }

  @Patch('tickets/:id/priority')
  @RequirePermission('support.manage')
  async setPriority(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetPriorityDto,
  ) {
    return this.supportService.setTicketPriority(admin.id, id, dto.priority);
  }

  @Patch('tickets/:id/reply')
  @RequirePermission('support.manage')
  async reply(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.adminReply(admin.id, id, dto.message);
  }

  @Patch('tickets/:id/resolve')
  @RequirePermission('support.manage')
  async resolve(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.supportService.resolveTicket(admin.id, id);
  }

  @Patch('tickets/:id/close')
  @RequirePermission('support.manage')
  async close(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.supportService.adminCloseTicket(admin.id, id);
  }
}
