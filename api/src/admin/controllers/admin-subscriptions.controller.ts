import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AdminSubscriptionsService } from '../services/admin-subscriptions.service';

import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('subscriptions.read')
export class AdminSubscriptionsController {
  constructor(
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.adminSubscriptionsService.getStats();
  }

  @Get()
  async getAll(
    @Query('status')
    status?: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired',
    @Query('planId') planId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminSubscriptionsService.getAll({
      status,
      planId,
      userId,
      from,
      to,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.adminSubscriptionsService.getOne(id);
  }
}
