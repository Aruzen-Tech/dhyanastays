import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AdminLevel, ConversationStatus, UserRole } from '@prisma/client';
import {
  CurrentUser,
  RequestUser,
} from '../common/decorators/current-user.decorator';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * Ops console for concierge threads. L1 (super admin) and L2 (ops) can list
 * active threads, filter by SLA breach, join a thread with a visible system
 * message, and post messages on behalf of the platform.
 */
@Controller('admin/concierge')
@AdminLevelGuard(AdminLevel.L1, AdminLevel.L2)
export class AdminConciergeController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('breached') breached?: string,
  ) {
    return this.messaging.listConciergeThreadsForAdmin({
      status: this.parseStatus(status),
      breachedOnly: breached === 'true',
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.messaging.adminGetConversationById(id);
  }

  @Post(':id/join')
  join(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.messaging.adminJoinThread(id, user.sub);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messaging.sendMessage(id, user.sub, UserRole.ADMIN, dto);
  }

  private parseStatus(raw?: string): ConversationStatus | undefined {
    if (!raw) return undefined;
    const upper = raw.toUpperCase();
    if (upper in ConversationStatus) return upper as ConversationStatus;
    return undefined;
  }
}
