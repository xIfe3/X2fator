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
   * Get a single active plan.
   */
  @Public()
  @Get(':id')
  async getActivePlan(@Param('id') id: string) {
    return this.plansService.findActiveById(id);
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
   * Admin: create plan.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  /**
   * Admin: update plan.
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  /**
   * Admin: delete plan.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deletePlan(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
