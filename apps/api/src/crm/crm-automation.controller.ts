import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmAutomationService } from './crm-automation.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm/automations')
export class CrmAutomationController {
  constructor(private readonly automation: CrmAutomationService) {}

  @Get()
  list() {
    return this.automation.list();
  }

  @Post()
  create(@Body() dto: CreateAutomationRuleDto, @CurrentUser() user: RequestUser) {
    return this.automation.create(dto, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.automation.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.automation.remove(id);
  }
}
