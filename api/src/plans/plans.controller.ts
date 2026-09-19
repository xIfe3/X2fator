import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';

import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

import { RequirePermission } from '../common/decorators/required-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * Public/user endpoint.
   * Only active plans are returned.
   */
  @Public()
  @Get()
  async getActivePlans() {
    return this.plansService.findActivePlans();
  }

  /**
   * Admin: get every plan.
   */
  @Get('admin/all')
  @UseGuards(PermissionsGuard)
  @RequirePermission('plans.manage')
  async getAllPlans() {
    return this.plansService.findAll();
  }

  /**
   * Get a single active plan.
   */
  @Public()
  @Get(':id')
  async getActivePlan(@Param('id') id: string) {
    return this.plansService.findActiveById(id);
  }

  /**
   * Admin: create plan.
   */
  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('plans.manage')
  async createPlan(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreatePlanDto) {
    return this.plansService.create(admin.id, dto);
  }

  /**
   * Admin: update plan.
   */
  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('plans.manage')
  async updatePlan(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.update(admin.id, id, dto);
  }

  /**
   * Admin: delete plan.
   */
  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('plans.manage')
  async deletePlan(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.plansService.remove(admin.id, id);
  }
}
