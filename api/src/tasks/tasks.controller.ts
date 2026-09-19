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

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/types/authenticated-request';
import { RequirePermission } from '../common/decorators/required-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getTasks(user.id);
  }

  /**
   * Admin: list every task, active and inactive.
   */
  @Get('admin/all')
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.manage')
  async getAllTasks() {
    return this.tasksService.getAllTasks();
  }

  /**
   * Admin: list task completions awaiting screenshot review.
   */
  @Get('admin/completions/pending')
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.review')
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.manage')
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.review')
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.review')
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.manage')
  async updateTask(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(admin.id, id, dto);
  }

  /**
   * Admin: delete several tasks at once (only those with no completion
   * history are removed — see TasksService.bulkDeleteTasks).
   */
  @Post('bulk-delete')
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.manage')
  async bulkDeleteTasks(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() body: { taskIds: string[] },
  ) {
    return this.tasksService.bulkDeleteTasks(admin.id, body.taskIds ?? []);
  }

  /**
   * Admin: delete a task (only if it has no completion history).
   */
  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('tasks.manage')
  async deleteTask(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.deleteTask(admin.id, id);
  }
}
