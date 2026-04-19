import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  RequestUser,
} from '../common/decorators/current-user.decorator';
import { SosService } from './sos.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpsertTrustedContactDto } from './dto/trusted-contact.dto';

/**
 * Guest-facing SOS routes. POST /sos is rate-limited to 5 req/min per IP
 * so a stuck tap or a script can't flood the broadcast queue — legitimate
 * double-taps stay within the budget. Trusted contact CRUD has the normal
 * global limit.
 */
@Controller()
export class SosController {
  constructor(private readonly sos: SosService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sos')
  createIncident(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.sos.createIncident(user.sub, dto);
  }

  @Get('sos')
  listMyIncidents(@CurrentUser() user: RequestUser) {
    return this.sos.listMyIncidents(user.sub);
  }

  @Get('sos/:id')
  getIncident(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.sos.getIncidentForUser(user.sub, id);
  }

  // ── Trusted contacts ─────────────────────────────────────────────────────

  @Get('me/trusted-contacts')
  listContacts(@CurrentUser() user: RequestUser) {
    return this.sos.listTrustedContacts(user.sub);
  }

  @Post('me/trusted-contacts')
  createContact(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpsertTrustedContactDto,
  ) {
    return this.sos.createTrustedContact(user.sub, dto);
  }

  @Put('me/trusted-contacts/:id')
  updateContact(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpsertTrustedContactDto,
  ) {
    return this.sos.updateTrustedContact(user.sub, id, dto);
  }

  @Delete('me/trusted-contacts/:id')
  deleteContact(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.sos.deleteTrustedContact(user.sub, id);
  }
}
