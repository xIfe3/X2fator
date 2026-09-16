import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  async createTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get('tickets')
  async getMyTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.getMyTickets(user.id);
  }

  @Get('tickets/:id')
  async getMyTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.supportService.getMyTicket(user.id, id);
  }

  @Get('tickets/:id/messages')
  async getTicketMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.supportService.getTicketMessages(user.id, id);
  }

  @Post('tickets/:id/messages')
  async addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(user.id, id, dto.message);
  }

  @Patch('tickets/:id/close')
  async closeTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.supportService.closeTicket(user.id, id);
  }
}
