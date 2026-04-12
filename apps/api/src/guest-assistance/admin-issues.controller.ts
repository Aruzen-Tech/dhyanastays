import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IssueStatus, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GuestAssistanceService } from './guest-assistance.service';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/issues')
export class AdminIssuesController {
  constructor(private readonly assistanceService: GuestAssistanceService) {}

  @Get()
  getAll(@Query('status') status?: IssueStatus) {
    return this.assistanceService.getAllIssues(status);
  }

  @Patch(':id')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateIssueStatusDto,
  ) {
    return this.assistanceService.updateIssueStatus(user.sub, 'ADMIN', id, dto);
  }
}
