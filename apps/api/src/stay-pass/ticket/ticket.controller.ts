import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { FeatureGate } from '../../common/decorators/feature-gate.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { StayPassService } from '../stay-pass.service';

/**
 * Guest-facing ticket routes.
 * - GET /bookings/:id/ticket        → full manifest (owner or admin only)
 * - GET /bookings/:id/ticket/share  → share-safe asset URLs only (no QR/PII)
 */
@FeatureGate('stay_pass')
@Controller('bookings/:id/ticket')
export class TicketController {
  constructor(
    private readonly stayPass: StayPassService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getTicket(@CurrentUser() user: RequestUser, @Param('id') bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { guestId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== user.sub && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const ticket = await this.stayPass.getTicket(bookingId);
    if (!ticket) {
      // Render is async (sweep ≤30s) — tell the client to poll.
      return { status: 'PENDING', assets: null };
    }
    const assets = ticket.assets as Record<string, { url: string }>;
    return {
      status: ticket.status,
      themeId: ticket.themeId,
      themeVersion: ticket.themeVersion,
      templateVersion: ticket.templateVersion,
      assets: {
        hero: assets?.hero?.url ?? null,
        full: assets?.full?.url ?? null,
        pdf: assets?.pdf?.url ?? null,
      },
    };
  }

  /** Share-safe variants only — safe to post publicly (no QR, no ref, no surname). */
  @Get('share')
  async getShareAssets(@CurrentUser() user: RequestUser, @Param('id') bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { guestId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== user.sub && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }
    const ticket = await this.stayPass.getTicket(bookingId);
    const assets = (ticket?.assets ?? {}) as Record<string, { url: string }>;
    return {
      status: ticket?.status ?? 'PENDING',
      og: assets?.og?.url ?? null,
      story: assets?.story?.url ?? null,
    };
  }
}
