import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ExperienceBookingStatus,
  ExperienceStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { withSerializableRetry } from '../common/services/serializable-retry';
import { NotificationService } from '../notification/notification.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { BookExperienceDto } from './dto/book-experience.dto';
import { ModerateExperienceDto } from './dto/moderate-experience.dto';

@Injectable()
export class ExperienceService {
  private readonly logger = new Logger(ExperienceService.name);

  // Booking statuses that count as "seats taken" — excludes CANCELLED/REFUNDED.
  // Shared by countSeatsSold() and every listing query's booking count so the
  // two never disagree on what "an active booking" means.
  private readonly activeBookingStatuses: ExperienceBookingStatus[] = [
    ExperienceBookingStatus.HELD,
    ExperienceBookingStatus.CONFIRMED,
    ExperienceBookingStatus.COMPLETED,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Host ────────────────────────────────────────────────────────────────────

  async listHostExperiences(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) throw new ForbiddenException('Host profile not found');
    const experiences = await this.prisma.experience.findMany({
      where: { hostId: host.id },
      orderBy: { startsAt: 'desc' },
      include: {
        _count: {
          select: { bookings: { where: { status: { in: this.activeBookingStatuses } } } },
        },
        // _count.bookings above counts booking *rows*, not seats — a single
        // booking can hold several seats, so it understates how full an
        // experience is whenever seats > 1. bookedSeats (added below) is the
        // correct seats-sold figure, computed the same way
        // listPublicExperiences() already does for seatsAvailable. _count is
        // left untouched for backward compatibility with any existing caller.
        bookings: {
          where: { status: { in: this.activeBookingStatuses } },
          select: { seats: true },
        },
      },
    });
    return experiences.map(({ bookings, ...experience }) => ({
      ...experience,
      bookedSeats: bookings.reduce((sum, b) => sum + b.seats, 0),
    }));
  }

  async createHostExperience(userId: string, dto: CreateExperienceDto) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host || host.verificationStatus !== 'APPROVED') {
      throw new ForbiddenException('Host must be approved before creating experiences');
    }
    this.validateWindow(dto.startsAt, dto.endsAt);

    if (dto.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: dto.listingId },
        select: { hostId: true },
      });
      if (!listing || listing.hostId !== host.id) {
        throw new ForbiddenException('Listing does not belong to host');
      }
    }

    const experience = await this.prisma.experience.create({
      data: {
        hostId: host.id,
        createdById: userId,
        listingId: dto.listingId ?? null,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        city: dto.city,
        state: dto.state,
        country: dto.country ?? 'India',
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        capacity: dto.capacity,
        priceMinor: dto.priceMinor,
        imageUrl: dto.imageUrl ?? null,
        gallery: dto.gallery ?? [],
        video: dto.video ?? null,
        included: dto.included ?? [],
        status: ExperienceStatus.PENDING_APPROVAL,
      },
    });

    await this.writeAudit(userId, 'EXPERIENCE_CREATE', 'experience', experience.id, {
      title: experience.title,
    });
    return experience;
  }

  async updateHostExperience(
    userId: string,
    id: string,
    dto: UpdateExperienceDto,
  ) {
    const experience = await this.getOwnedHostExperience(userId, id);
    if (dto.startsAt || dto.endsAt) {
      this.validateWindow(
        dto.startsAt ?? experience.startsAt.toISOString(),
        dto.endsAt ?? experience.endsAt.toISOString(),
      );
    }

    const data: Prisma.ExperienceUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
      ...(dto.endsAt && { endsAt: new Date(dto.endsAt) }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.priceMinor !== undefined && { priceMinor: dto.priceMinor }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.gallery !== undefined && { gallery: dto.gallery }),
      ...(dto.video !== undefined && { video: dto.video }),
      ...(dto.included !== undefined && { included: dto.included }),
      // Edits to approved experience require re-review
      ...(experience.status === ExperienceStatus.APPROVED && {
        status: ExperienceStatus.PENDING_APPROVAL,
      }),
    };

    if (dto.capacity === undefined) {
      // No capacity change — plain update, no locking needed (nothing about
      // the seats-sold invariant is being touched).
      const updated = await this.prisma.experience.update({ where: { id }, data });
      await this.writeAudit(userId, 'EXPERIENCE_UPDATE', 'experience', id, {});
      return updated;
    }

    // Capacity is changing — must be race-safe against a concurrent
    // bookExperience() call, which takes the same FOR UPDATE lock on this
    // row before checking/consuming seats. Whichever transaction acquires
    // the lock first is evaluated against the true committed state; the
    // other then sees that committed result before making its own decision.
    const newCapacity = dto.capacity;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await withSerializableRetry(this.prisma as any, async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Experience" WHERE id = ${id} FOR UPDATE`;
      const seatsSold = await this.countSeatsSold(id, tx);
      if (newCapacity < seatsSold) {
        throw new BadRequestException(
          `Capacity cannot be reduced below ${seatsSold} seat(s) already booked`,
        );
      }
      return tx.experience.update({ where: { id }, data });
    });
    await this.writeAudit(userId, 'EXPERIENCE_UPDATE', 'experience', id, {});
    return updated;
  }

  async closeHostExperience(userId: string, id: string) {
    await this.getOwnedHostExperience(userId, id);
    const updated = await this.prisma.experience.update({
      where: { id },
      data: { status: ExperienceStatus.CLOSED },
    });
    await this.writeAudit(userId, 'EXPERIENCE_CLOSE', 'experience', id, {});
    return updated;
  }

  // Host-scoped single-record fetch — unlike getPublicExperience(), not
  // filtered to APPROVED, so a host can load their own experience while it's
  // still PENDING_APPROVAL, REJECTED, or CLOSED. Reuses the same ownership
  // helper updateHostExperience()/closeHostExperience() already rely on.
  async getHostExperienceById(userId: string, id: string) {
    return this.getOwnedHostExperience(userId, id);
  }

  async getHostExperienceBookings(userId: string, id: string) {
    await this.getOwnedHostExperience(userId, id);
    return this.prisma.experienceBooking.findMany({
      where: { experienceId: id },
      orderBy: { createdAt: 'desc' },
      include: { guest: { select: { id: true, fullName: true, email: true } } },
    });
  }

  // ── Public / Guest ──────────────────────────────────────────────────────────

  async listPublicExperiences(params: {
    city?: string;
    category?: string;
    upcoming?: boolean;
  }) {
    const where: Prisma.ExperienceWhereInput = {
      status: ExperienceStatus.APPROVED,
    };
    if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
    if (params.category) where.category = params.category;
    if (params.upcoming !== false) {
      where.startsAt = { gte: new Date() };
    }
    const experiences = await this.prisma.experience.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      take: 100,
      include: {
        host: { select: { user: { select: { fullName: true, avatarUrl: true } } } },
        _count: {
          select: { bookings: { where: { status: { in: this.activeBookingStatuses } } } },
        },
        // seatsAvailable needs the SUM of seats across active bookings, not a
        // row count — _count above can't be reused for it (one booking can
        // hold several seats). Fetched batched here (one query, no N+1) the
        // same way getPublicExperience() already computes it via
        // countSeatsSold(), just without a second round-trip per row.
        bookings: {
          where: { status: { in: this.activeBookingStatuses } },
          select: { seats: true },
        },
      },
    });
    // Same frontend-friendly aliases as getPublicExperience(), reused via the
    // shared private helper rather than duplicated — filtering, ordering,
    // and the take:100 cap above are unchanged.
    return experiences.map(({ bookings, ...experience }) => ({
      ...experience,
      ...this.toPublicFieldAliases(experience),
      seatsAvailable: Math.max(
        0,
        experience.capacity - bookings.reduce((sum, b) => sum + b.seats, 0),
      ),
    }));
  }

  async getPublicExperience(id: string) {
    const experience = await this.prisma.experience.findFirst({
      where: { id, status: ExperienceStatus.APPROVED },
      include: {
        host: { select: { user: { select: { fullName: true, avatarUrl: true } } } },
        listing: { select: { id: true, title: true, city: true, state: true } },
      },
    });
    if (!experience) throw new NotFoundException('Experience not found');
    const seatsSold = await this.countSeatsSold(id);
    return {
      ...experience,
      seatsAvailable: Math.max(0, experience.capacity - seatsSold),
      // Frontend-friendly aliases for the Experience Details page — additive
      // only; every existing field above (title, priceMinor, imageUrl, city,
      // state, capacity, startsAt, endsAt, ...) is left in the response
      // unchanged for any other consumer that already depends on it.
      ...this.toPublicFieldAliases(experience),
    };
  }

  async bookExperience(userId: string, id: string, dto: BookExperienceDto) {
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    const existing = await this.prisma.experienceBooking.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      // The key is client-supplied — without this check, a guest who
      // reuses (or guesses) another guest's idempotencyKey would receive
      // that guest's booking record instead of a clean rejection.
      if (existing.guestId !== userId) {
        throw new ConflictException('Idempotency key belongs to another user');
      }
      return existing;
    }

    // Capacity check + booking insert must be atomic against a concurrent
    // booking (or a concurrent host capacity edit — see updateHostExperience)
    // for the same experience: reading "seats available" and inserting the
    // new booking have to happen as one indivisible step, otherwise two
    // requests can each see room and both commit, overselling the
    // experience. Locking the Experience row first — and re-reading all
    // state only after the lock is held — closes that gap.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = await withSerializableRetry(this.prisma as any, async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Experience" WHERE id = ${id} FOR UPDATE`;

      const experience = await tx.experience.findUnique({ where: { id } });
      if (!experience || experience.status !== ExperienceStatus.APPROVED) {
        throw new NotFoundException('Experience not found');
      }
      if (experience.startsAt.getTime() < Date.now()) {
        throw new BadRequestException('Experience has already started');
      }

      const used = await this.countSeatsSold(id, tx);
      if (used + dto.seats > experience.capacity) {
        throw new BadRequestException('Not enough seats available');
      }

      const totalMinor = experience.priceMinor * dto.seats;
      return tx.experienceBooking.create({
        data: {
          experienceId: id,
          guestId: userId,
          seats: dto.seats,
          totalMinor,
          currency: experience.currency,
          status: ExperienceBookingStatus.CONFIRMED,
          idempotencyKey,
        },
      });
    });

    await this.writeAudit(userId, 'EXPERIENCE_BOOK', 'experience_booking', booking.id, {
      experienceId: id,
      seats: dto.seats,
      totalMinor: booking.totalMinor,
    });

    return booking;
  }

  async listGuestBookings(userId: string) {
    return this.prisma.experienceBooking.findMany({
      where: { guestId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        experience: {
          select: {
            id: true, title: true, category: true, city: true, state: true,
            startsAt: true, endsAt: true, imageUrl: true,
          },
        },
      },
    });
  }

  async cancelGuestBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.experienceBooking.findUnique({
      where: { id: bookingId },
      include: { experience: true },
    });
    if (!booking || booking.guestId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (
      booking.status === ExperienceBookingStatus.CANCELLED ||
      booking.status === ExperienceBookingStatus.REFUNDED
    ) {
      return booking;
    }
    if (booking.experience.startsAt.getTime() < Date.now()) {
      throw new BadRequestException('Cannot cancel after start');
    }
    const updated = await this.prisma.experienceBooking.update({
      where: { id: bookingId },
      data: {
        status: ExperienceBookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
    await this.writeAudit(userId, 'EXPERIENCE_CANCEL', 'experience_booking', bookingId, {});
    return updated;
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  async adminListExperiences(status?: ExperienceStatus) {
    return this.prisma.experience.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        host: { select: { user: { select: { fullName: true, email: true } } } },
        _count: {
          select: { bookings: { where: { status: { in: this.activeBookingStatuses } } } },
        },
      },
    });
  }

  async moderateExperience(
    actorUserId: string,
    id: string,
    dto: ModerateExperienceDto,
  ) {
    const experience = await this.prisma.experience.findUnique({ where: { id } });
    if (!experience) throw new NotFoundException('Experience not found');
    const updated = await this.prisma.experience.update({
      where: { id },
      data: {
        status:
          dto.action === 'APPROVED'
            ? ExperienceStatus.APPROVED
            : ExperienceStatus.REJECTED,
        reviewedBy: actorUserId,
        reviewNotes: dto.notes ?? null,
        reviewedAt: new Date(),
      },
    });
    await this.writeAudit(
      actorUserId,
      `EXPERIENCE_${dto.action}`,
      'experience',
      id,
      { notes: dto.notes ?? null },
    );
    return updated;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Additive frontend-friendly field aliases for the Experience Details and
   * Listing pages (name, price, image, groupSize, location, duration, host)
   * — layered on top of the existing response, never replacing the original
   * fields (title, priceMinor, imageUrl, capacity, city, state, startsAt,
   * endsAt, host stay as-is for any other consumer). gallery/video/included
   * are passed through unchanged since they're already stored under
   * frontend-matching names.
   *
   * Wired into both getPublicExperience() and listPublicExperiences() so the
   * two endpoints return the same field shape.
   *
   * Assumptions made in the absence of an explicit spec (flag for review):
   *  - `price` is priceMinor / 100 (rupees) — confirmed against the live
   *    Experience Details page, which currently does this same conversion
   *    client-side via formatINR() before this mapping existed.
   *  - `location` is `"${city}, ${state}"`.
   *  - `duration` is a human-readable string computed from startsAt/endsAt
   *    (see formatExperienceDuration).
   *  - `host.name` is the host user's fullName; `host.avatar` is the host
   *    user's avatarUrl (may be null — no fallback image exists yet).
   *  - `host.role` has no backing field anywhere in the schema (Host has no
   *    bio/title/role column) — a fixed display label is used as a
   *    placeholder rather than adding a schema field for this sprint. Revisit
   *    if hosts need a real, editable role/bio.
   *  - `rating` and `reviewCount` are always `0` — there is no review model
   *    linked to Experience anywhere in the schema (the existing `Review`
   *    model is tied to stay `listingId`/`bookingId` only, not
   *    `Experience`/`ExperienceBooking`), so there is no real data to
   *    aggregate. Returning fabricated non-zero numbers would violate the
   *    "no fake data" requirement for this sprint; `0`/`0` is the honest
   *    representation of "no reviews recorded yet". Revisit once an
   *    experience-review model exists — this is the single place to wire
   *    a real aggregate in.
   */
  private toPublicFieldAliases(experience: {
    title: string;
    priceMinor: number;
    imageUrl: string | null;
    capacity: number;
    city: string;
    state: string;
    startsAt: Date;
    endsAt: Date;
    gallery: string[];
    video: string | null;
    included: string[];
    host?: { user: { fullName: string; avatarUrl: string | null } } | null;
  }) {
    return {
      name: experience.title,
      // No experience-review model exists anywhere in the schema today, so
      // there is nothing to aggregate — 0/0 is factual, not a placeholder.
      rating: 0,
      reviewCount: 0,
      // Rupees, not paise — unlike priceMinor (left untouched above for any
      // consumer still reading it raw), `price` is the display-ready amount
      // this frontend field name implies. Verified against the live
      // Experience Details page, which currently divides priceMinor by 100
      // itself before display (apps/web/lib/api.ts formatINR()).
      price: experience.priceMinor / 100,
      image: experience.imageUrl,
      groupSize: experience.capacity,
      location: `${experience.city}, ${experience.state}`,
      duration: this.formatExperienceDuration(experience.startsAt, experience.endsAt),
      gallery: experience.gallery,
      video: experience.video,
      included: experience.included,
      host: experience.host
        ? {
            name: experience.host.user.fullName,
            role: 'Experience Host',
            avatar: experience.host.user.avatarUrl,
          }
        : null,
    };
  }

  /** Human-readable duration from an experience's startsAt/endsAt window. */
  private formatExperienceDuration(startsAt: Date, endsAt: Date): string {
    const totalMinutes = Math.max(
      0,
      Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
    );
    if (totalMinutes < 60) return `${totalMinutes} min`;
    if (totalMinutes < 24 * 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
    }
    const days = Math.round(totalMinutes / (24 * 60));
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  private async getOwnedHostExperience(userId: string, id: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) throw new ForbiddenException('Host profile not found');
    const experience = await this.prisma.experience.findUnique({ where: { id } });
    if (!experience || experience.hostId !== host.id) {
      throw new NotFoundException('Experience not found');
    }
    return experience;
  }

  private validateWindow(startsAt: string | Date, endsAt: string | Date) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    if (start.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('startsAt must be in the future');
    }
  }

  private async countSeatsSold(
    experienceId: string,
    // Defaults to the plain client for read-only callers (e.g.
    // getPublicExperience); locked callers pass their transaction client so
    // the count is read under the same FOR UPDATE lock they're holding.
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const agg = await client.experienceBooking.aggregate({
      where: {
        experienceId,
        status: { in: this.activeBookingStatuses },
      },
      _sum: { seats: true },
    });
    return agg._sum.seats ?? 0;
  }

  private async writeAudit(
    actorUserId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        resourceType,
        resourceId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
