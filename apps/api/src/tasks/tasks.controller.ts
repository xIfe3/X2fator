import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/types/authenticated-request';

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

  @Post()
  async createTask(@Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(dto);
  }

  @Post(':id/complete')
  async completeTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') taskId: string,
    @Body()
    body: {
      submissionData?: Record<string, unknown>;
      screenshotUrl?: string;
    },
  ) {
    return this.tasksService.completeTask(
      user.id,
      taskId,
      body.submissionData,
      body.screenshotUrl,
    );
  }

  @Patch(':id')
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto);
  }
}
