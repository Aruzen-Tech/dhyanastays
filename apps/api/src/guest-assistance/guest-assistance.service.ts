import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IssueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

const CONFIRMED_STATUSES = ['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'COMPLETED'];

@Injectable()
export class GuestAssistanceService {
  private readonly logger = new Logger(GuestAssistanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Directions ──────────────────────────────────────────────────────

  async getDirectionsForBooking(userId: string, bookingId: string) {
    const booking = await this.getConfirmedBooking(userId, bookingId);
    return {
      bookingId: booking.id,
      listingTitle: booking.listing.title,
      propertyDirections: booking.listing.propertyDirections ?? null,
    };
  }

  // ─── Manual ──────────────────────────────────────────────────────────

  async getManualForBooking(userId: string, bookingId: string) {
    const booking = await this.getConfirmedBooking(userId, bookingId);
    return {
      bookingId: booking.id,
      listingTitle: booking.listing.title,
      propertyManual: booking.listing.propertyManual ?? null,
    };
  }

  // ─── Issues ──────────────────────────────────────────────────────────

  async createIssue(userId: string, bookingId: string, dto: CreateIssueDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { include: { host: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) throw new ForbiddenException('Not your booking');
    if (!CONFIRMED_STATUSES.includes(booking.status)) {
      throw new ForbiddenException('Can only report issues for confirmed bookings');
    }

    const issue = await this.prisma.guestIssue.create({
      data: {
        bookingId: booking.id,
        listingId: booking.listingId,
        guestId: userId,
        category: dto.category,
        description: dto.description,
        urgency: dto.urgency,
        photoUrl: dto.photoUrl,
      },
    });

    // In-app notification to host
    await this.prisma.hostNotification.create({
      data: {
        hostId: booking.listing.hostId,
        type: 'ISSUE_REPORTED',
        title: 'New Issue Reported',
        message: `A guest has reported a ${dto.category.toLowerCase()} issue for ${booking.listing.title}.`,
        metadata: { issueId: issue.id, bookingId, category: dto.category, urgency: dto.urgency ?? 'MEDIUM' },
      },
    });

    // Admin notification for urgent issues
    if (dto.urgency === 'URGENT') {
      await this.prisma.adminNotification.create({
        data: {
          type: 'URGENT_ISSUE',
          title: 'Urgent Issue Reported',
          message: `Urgent ${dto.category.toLowerCase()} issue at ${booking.listing.title}.`,
          metadata: { issueId: issue.id, bookingId, listingId: booking.listingId },
        },
      });
    }

    return issue;
  }

  async getIssuesForBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) throw new ForbiddenException('Not your booking');

    return this.prisma.guestIssue.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIssuesForHost(userId: string, status?: IssueStatus) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) throw new ForbiddenException('Host profile not found');

    const where: Record<string, unknown> = {
      listing: { hostId: host.id },
    };
    if (status) where.status = status;

    return this.prisma.guestIssue.findMany({
      where,
      include: {
        listing: { select: { id: true, title: true } },
        guest: { select: { fullName: true, email: true } },
        booking: { select: { id: true, startsAt: true, endsAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllIssues(status?: IssueStatus) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    return this.prisma.guestIssue.findMany({
      where,
      include: {
        listing: { select: { id: true, title: true } },
        guest: { select: { fullName: true, email: true } },
        booking: { select: { id: true, startsAt: true, endsAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateIssueStatus(userId: string, role: string, issueId: string, dto: UpdateIssueStatusDto) {
    const issue = await this.prisma.guestIssue.findUnique({
      where: { id: issueId },
      include: { listing: { include: { host: true } } },
    });
    if (!issue) throw new NotFoundException('Issue not found');

    // Host can only update issues for their listings
    if (role === 'HOST' && issue.listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot update issues for listings you do not own');
    }

    const data: Record<string, unknown> = {
      status: dto.status,
    };
    if (dto.hostNotes !== undefined) data.hostNotes = dto.hostNotes;
    if (dto.status === 'RESOLVED') data.resolvedAt = new Date();

    const updated = await this.prisma.guestIssue.update({
      where: { id: issueId },
      data,
    });

    // Notify guest of status change
    await this.prisma.guestNotification.create({
      data: {
        userId: issue.guestId,
        type: 'ISSUE_STATUS_CHANGED',
        title: 'Issue Update',
        message: `Your ${issue.category.toLowerCase()} issue has been updated to ${dto.status.replace('_', ' ').toLowerCase()}.`,
        metadata: { issueId, status: dto.status },
      },
    });

    return updated;
  }

  // ─── Check-in ────────────────────────────────────────────────────────

  async checkIn(userId: string, bookingId: string, dto: CheckInDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { include: { host: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) throw new ForbiddenException('Not your booking');
    if (!CONFIRMED_STATUSES.includes(booking.status)) {
      throw new ForbiddenException('Booking is not confirmed');
    }
    if (booking.checkInData) {
      throw new BadRequestException('Already checked in');
    }

    // Check-in available from startsAt day
    const now = new Date();
    const checkInDay = new Date(booking.startsAt);
    checkInDay.setHours(0, 0, 0, 0);
    if (now < checkInDay) {
      throw new BadRequestException('Check-in is not available yet');
    }

    const checkInData = {
      confirmedName: dto.confirmedName,
      arrivalTime: dto.arrivalTime,
      specialNotes: dto.specialNotes ?? null,
      checkedInAt: now.toISOString(),
    };

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { checkInData },
    });

    // Notify host
    await this.prisma.hostNotification.create({
      data: {
        hostId: booking.listing.hostId,
        type: 'GUEST_CHECKED_IN',
        title: 'Guest Checked In',
        message: `${dto.confirmedName} has checked in at ${booking.listing.title}.`,
        metadata: { bookingId, arrivalTime: dto.arrivalTime },
      },
    });

    return updated;
  }

  // ─── Check-out ───────────────────────────────────────────────────────

  async checkOut(userId: string, bookingId: string, dto: CheckOutDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { include: { host: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) throw new ForbiddenException('Not your booking');
    if (!booking.checkInData) {
      throw new BadRequestException('Must check in before checking out');
    }
    if (booking.checkOutData) {
      throw new BadRequestException('Already checked out');
    }

    // Check-out available within 24h window around endsAt
    const now = new Date();
    const windowStart = new Date(booking.endsAt.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(booking.endsAt.getTime() + 24 * 60 * 60 * 1000);
    if (now < windowStart || now > windowEnd) {
      throw new BadRequestException('Check-out is only available within 24 hours of your departure date');
    }

    const checkOutData = {
      feedback: dto.feedback ?? null,
      conditionNotes: dto.conditionNotes ?? null,
      checkedOutAt: now.toISOString(),
    };

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { checkOutData },
    });

    // Notify host
    await this.prisma.hostNotification.create({
      data: {
        hostId: booking.listing.hostId,
        type: 'GUEST_CHECKED_OUT',
        title: 'Guest Checked Out',
        message: `Your guest has checked out from ${booking.listing.title}.`,
        metadata: { bookingId },
      },
    });

    return updated;
  }

  // ─── Check-in/out Status ────────────────────────────────────────────

  async getCheckInOutStatus(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) throw new ForbiddenException('Not your booking');

    const now = new Date();
    const checkInDay = new Date(booking.startsAt);
    checkInDay.setHours(0, 0, 0, 0);
    const windowStart = new Date(booking.endsAt.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(booking.endsAt.getTime() + 24 * 60 * 60 * 1000);

    return {
      bookingId: booking.id,
      checkInData: booking.checkInData ?? null,
      checkOutData: booking.checkOutData ?? null,
      canCheckIn: !booking.checkInData && CONFIRMED_STATUSES.includes(booking.status) && now >= checkInDay,
      canCheckOut: !!booking.checkInData && !booking.checkOutData && now >= windowStart && now <= windowEnd,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private async getConfirmedBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            propertyDirections: true,
            propertyManual: true,
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) throw new ForbiddenException('Not your booking');
    if (!CONFIRMED_STATUSES.includes(booking.status)) {
      throw new ForbiddenException('Available only for confirmed bookings');
    }
    return booking;
  }
}
