import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * Guest side of the concierge chat (§5.10). Mounted under /bookings/:id/chat
 * so the route is naturally booking-scoped — the service verifies the
 * caller owns the booking and that the booking is in a confirmed state
 * before returning the thread.
 */
@Controller('bookings/:bookingId/chat')
@Roles(UserRole.GUEST)
export class GuestConciergeController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  getThread(
    @CurrentUser() user: RequestUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.messaging.getConciergeThreadForGuest(bookingId, user.sub);
  }

  /**
   * Rate limit: 30 messages/minute per guest. Generous enough for a
   * conversational flow, tight enough to block pathological flooding.
   */
  @Post('messages')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async send(
    @CurrentUser() user: RequestUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: SendMessageDto,
  ) {
    const thread = await this.messaging.getConciergeThreadForGuest(
      bookingId,
      user.sub,
    );
    return this.messaging.sendMessage(thread.id, user.sub, UserRole.GUEST, dto);
  }

  @Post('read')
  async markRead(
    @CurrentUser() user: RequestUser,
    @Param('bookingId') bookingId: string,
  ) {
    const thread = await this.messaging.getConciergeThreadForGuest(
      bookingId,
      user.sub,
    );
    return this.messaging.markRead(thread.id, user.sub);
  }
}
