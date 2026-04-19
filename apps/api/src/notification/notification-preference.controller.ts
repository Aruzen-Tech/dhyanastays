import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  CurrentUser,
  RequestUser,
} from '../common/decorators/current-user.decorator';
import { OutboxService } from './outbox.service';
import { UpsertNotificationPreferencesDto } from './dto/upsert-notification-preferences.dto';

@Controller('me/notification-preferences')
export class NotificationPreferenceController {
  constructor(private readonly outbox: OutboxService) {}

  @Get()
  async get(@CurrentUser() user: RequestUser) {
    return this.outbox.getPreference(user.sub);
  }

  @Put()
  async upsert(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpsertNotificationPreferencesDto,
  ) {
    await this.outbox.upsertPreference(user.sub, dto.channels, dto.quietHours);
    return this.outbox.getPreference(user.sub);
  }
}
