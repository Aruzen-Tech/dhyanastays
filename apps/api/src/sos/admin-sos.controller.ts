import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminLevel, SosStatus } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../common/decorators/current-user.decorator';
import { SosService } from './sos.service';
import {
  AckIncidentDto,
  ResolveIncidentDto,
} from './dto/update-incident.dto';

/**
 * Ops console. L1 staff can acknowledge / progress / resolve incidents;
 * L2+ gets the same plus the full audit trail via the broadcasts field.
 */
@AdminLevelGuard(AdminLevel.L1)
@Controller('admin/sos')
export class AdminSosController {
  constructor(private readonly sos: SosService) {}

  @Get()
  list(@Query('status') status?: SosStatus) {
    return this.sos.listIncidents(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.sos.listIncidents().then((list) => list.find((i) => i.id === id));
  }

  @Post(':id/ack')
  ack(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AckIncidentDto,
  ) {
    return this.sos.ackIncident(user.sub, id, dto);
  }

  @Post(':id/start')
  start(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.sos.startProgress(user.sub, id);
  }

  @Post(':id/resolve')
  resolve(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ResolveIncidentDto,
  ) {
    return this.sos.resolveIncident(user.sub, id, dto);
  }
}
