import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/types/authenticated-request';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks() {
    return this.tasksService.getTasks();
  }

  /**
   * Admin: list every task, active and inactive.
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllTasks() {
    return this.tasksService.getAllTasks();
  }

  /**
   * Admin: list task completions awaiting screenshot review.
   */
  @Get('admin/completions/pending')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getPendingCompletions() {
    return this.tasksService.getPendingCompletions();
  }

  @Get('my/completions')
  async getMyCompletions(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getMyCompletions(user.id);
  }

  @Get('my/completions/:id')
  async getMyCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.getCompletion(user.id, id);
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.tasksService.getTask(id);
  }

  /**
   * Admin: create task.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createTask(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(admin.id, dto);
  }

  @Post(':id/complete')
  async completeTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') taskId: string,
    @Body()
    body: {
      submissionData?: Record<string, unknown>;
      screenshotUrl: string;
    },
  ) {
    return this.tasksService.completeTask(
      user.id,
      taskId,
      body.submissionData,
      body.screenshotUrl,
    );
  }

  /**
   * Admin: approve a pending task completion. Credits the reward.
   */
  @Patch('admin/completions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async approveCompletion(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.tasksService.approveCompletion(admin.id, id, body?.note);
  }

  /**
   * Admin: reject a pending task completion. No reward is credited.
   */
  @Patch('admin/completions/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async rejectCompletion(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.tasksService.rejectCompletion(admin.id, id, body?.note);
  }

  /**
   * Admin: update task.
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateTask(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(admin.id, id, dto);
  }
}
