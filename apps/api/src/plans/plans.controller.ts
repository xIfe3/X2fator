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

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

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
  @UseGuards(RolesGuard)
  @Roles('admin')
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
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createPlan(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreatePlanDto) {
    return this.plansService.create(admin.id, dto);
  }

  /**
   * Admin: update plan.
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
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
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deletePlan(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.plansService.remove(admin.id, id);
  }
}
