import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AdminPaymentsService } from '../services/admin-payments.service';

import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('payments.read')
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Get('gateway-status')
  getGatewayStatus() {
    return this.adminPaymentsService.getGatewayStatus();
  }

  @Get('stats')
  async getStats() {
    return this.adminPaymentsService.getStats();
  }

  @Get()
  async getAll(
    @Query('provider') provider?: 'flutterwave' | 'manual' | 'mock',
    @Query('status')
    status?:
      | 'pending'
      | 'processing'
      | 'successful'
      | 'failed'
      | 'cancelled'
      | 'refunded',
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminPaymentsService.getAll({
      provider,
      status,
      userId,
      from,
      to,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.adminPaymentsService.getOne(id);
  }
}
