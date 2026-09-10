import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmOutreachService } from './crm-outreach.service';
import { SendOutreachDto } from './dto/outreach.dto';
import { SaveTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { LogInteractionDto } from './dto/log-interaction.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmOutreachController {
  constructor(private readonly outreach: CrmOutreachService) {}

  @Post('outreach')
  send(@Body() dto: SendOutreachDto, @CurrentUser() user: RequestUser) {
    return this.outreach.send(dto, user.sub);
  }

  @Post('contacts/:userId/log')
  log(
    @Param('userId') userId: string,
    @Body() dto: LogInteractionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.outreach.logInteraction(userId, dto, user.sub);
  }

  // ── Templates ──
  @Get('templates')
  listTemplates() {
    return this.outreach.listTemplates();
  }

  @Post('templates')
  createTemplate(@Body() dto: SaveTemplateDto, @CurrentUser() user: RequestUser) {
    return this.outreach.createTemplate(dto, user.sub);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.outreach.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) {
    return this.outreach.removeTemplate(id);
  }
}
