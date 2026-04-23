import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * Host side of the concierge chat (§5.10). Route mirrors the guest side
 * so a booking ID deep-links to the same thread from both dashboards.
 */
@Controller('host/bookings/:bookingId/chat')
@Roles(UserRole.HOST)
export class HostConciergeController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  getThread(
    @CurrentUser() user: RequestUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.messaging.getConciergeThreadForHost(bookingId, user.sub);
  }

  @Post('messages')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async send(
    @CurrentUser() user: RequestUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: SendMessageDto,
  ) {
    const thread = await this.messaging.getConciergeThreadForHost(
      bookingId,
      user.sub,
    );
    return this.messaging.sendMessage(thread.id, user.sub, UserRole.HOST, dto);
  }

  @Post('read')
  async markRead(
    @CurrentUser() user: RequestUser,
    @Param('bookingId') bookingId: string,
  ) {
    const thread = await this.messaging.getConciergeThreadForHost(
      bookingId,
      user.sub,
    );
    return this.messaging.markRead(thread.id, user.sub);
  }
}
