import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminLevel, CrmTaskStatus } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmTasksService } from './crm-tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmTasksController {
  constructor(private readonly tasks: CrmTasksService) {}

  @Get('tasks')
  list(@Query('status') status?: CrmTaskStatus, @Query('assigneeId') assigneeId?: string) {
    return this.tasks.list({ status, assigneeId });
  }

  @Get('contacts/:userId/tasks')
  listForContact(@Param('userId') userId: string) {
    return this.tasks.listForContact(userId);
  }

  @Post('tasks')
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: RequestUser) {
    return this.tasks.create(dto, user.sub);
  }

  @Patch('tasks/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: RequestUser) {
    return this.tasks.update(id, dto, user.sub);
  }

  @Post('tasks/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasks.complete(id, user.sub);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.tasks.remove(id);
  }
}
