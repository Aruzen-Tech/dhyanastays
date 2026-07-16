import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { AddSeasonalRateDto } from './dto/add-seasonal-rate.dto';
import { AddAvailabilityBlockDto } from './dto/add-availability-block.dto';
import { UpdatePreparationDto } from './dto/update-preparation.dto';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {}

  async createHostListing(userId: string, dto: CreateListingDto) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host || host.verificationStatus !== 'APPROVED') {
      throw new ForbiddenException('Host must be approved before listing');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listing = await (this.prisma as any).$transaction(async (tx: any) => {
      const created = await tx.listing.create({
        data: {
          hostId: host.id,
          createdById: userId,
          title: dto.title,
          description: dto.description,
          city: dto.city,
          state: dto.state,
          ...(dto.latitude !== undefined && { latitude: dto.latitude }),
          ...(dto.longitude !== undefined && { longitude: dto.longitude }),
          status: ListingStatus.PENDING_APPROVAL,
        },
      });
      await tx.rateRule.create({
        data: {
          listingId: created.id,
          baseNightlyRate: dto.baseNightlyRate,
          maxGuests: dto.maxGuests,
          cleaningFee: 0,
          minNights: 1,
        },
      });
      return created;
    });
    await this.writeAudit(userId, 'LISTING_CREATE', 'listing', listing.id, {
      status: listing.status,
      baseNightlyRate: dto.baseNightlyRate,
      maxGuests: dto.maxGuests,
    });

    // Admin notification: new listing pending approval
    void this.prisma.adminNotification.create({
      data: {
        type: 'LISTING_PENDING_APPROVAL',
        title: 'New listing awaiting approval',
        message: `"${dto.title}" in ${dto.city}, ${dto.state} needs review.`,
        metadata: { listingId: listing.id, hostId: host.id },
      },
    }).catch(() => {});

    return this.prisma.listing.findUnique({
      where: { id: listing.id },
      include: { rateRules: true, media: true },
    });
  }

  async updateHostListing(userId: string, listingId: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot edit listing you do not own');
    }

    const { baseNightlyRate, maxGuests, minNights, cleaningFee, ...listingFields } = dto;
    const hasRateChanges = [baseNightlyRate, maxGuests, minNights, cleaningFee].some(
      (v) => v !== undefined,
    );

    const reapprovalTriggered = this.isReapprovalTriggered(dto);
    const data: Prisma.ListingUpdateInput = {
      ...(listingFields as Prisma.ListingUpdateInput),
      ...(reapprovalTriggered
        ? { status: ListingStatus.PENDING_APPROVAL, needsReapproval: true }
        : {}),
    };

    await this.prisma.listing.update({ where: { id: listingId }, data });

    if (hasRateChanges) {
      await this.prisma.rateRule.updateMany({
        where: { listingId },
        data: {
          ...(baseNightlyRate !== undefined && { baseNightlyRate }),
          ...(maxGuests !== undefined && { maxGuests }),
          ...(minNights !== undefined && { minNights }),
          ...(cleaningFee !== undefined && { cleaningFee }),
        },
      });
    }

    await this.writeAudit(userId, 'LISTING_UPDATE', 'listing', listingId, {
      reapprovalTriggered,
      fields: Object.keys(dto),
    });

    const updated = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { rateRules: true, media: true },
    });

    if (updated && updated.status === ListingStatus.APPROVED) {
      void this.meiliIndex(updated);
    }

    return updated;
  }

  async getHostListings(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) throw new ForbiddenException('Host profile not found');
    return this.prisma.listing.findMany({
      where: { hostId: host.id },
      include: { rateRules: true, media: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingListings() {
    return this.prisma.listing.findMany({
      where: { status: ListingStatus.PENDING_APPROVAL },
      include: { rateRules: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewListing(
    actorUserId: string,
    listingId: string,
    action: 'approve' | 'reject' | 'request_changes',
    note?: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { rateRules: true, media: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const status =
      action === 'approve'
        ? ListingStatus.APPROVED
        : action === 'reject'
          ? ListingStatus.REJECTED
          : ListingStatus.CHANGES_REQUESTED;

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status, needsReapproval: false },
    });

    await this.writeAudit(actorUserId, `LISTING_${action.toUpperCase()}`, 'listing', listingId, {
      previousStatus: listing.status,
      nextStatus: status,
      note: note ?? null,
    });

    if (action === 'approve') {
      void this.meiliIndex({ ...listing, status: ListingStatus.APPROVED });
    } else if (action === 'reject') {
      void this.meiliDelete(listingId);
    }

    void this.sendListingReviewNotification(listing.hostId, listingId, listing.title, action, note);

    return updated;
  }

  async getHostProfile(userId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, fullName: true, createdAt: true } },
      },
    });
    if (!host) throw new NotFoundException('Host profile not found');
    return host;
  }

  async getPendingHosts() {
    return this.prisma.host.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: { select: { id: true, email: true, fullName: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewHost(actorUserId: string, hostId: string, action: 'approve' | 'reject') {
    const host = await this.prisma.host.findUnique({ where: { id: hostId } });
    if (!host) throw new NotFoundException('Host not found');
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.host.update({
      where: { id: hostId },
      data: { verificationStatus: status as 'APPROVED' | 'REJECTED' },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    await this.writeAudit(actorUserId, `HOST_${action.toUpperCase()}`, 'host', hostId, {
      previousStatus: host.verificationStatus,
      nextStatus: status,
    });
    return updated;
  }

  async getPublicListings() {
    return this.prisma.listing.findMany({
      where: { status: ListingStatus.APPROVED },
      include: {
        rateRules: true,
        media: { orderBy: { sortOrder: 'asc' }, take: 1 },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Faceted discovery endpoint (§5.18). Combines text query, experience tags,
   * dietary options, property type, and sort. Returns APPROVED listings only.
   */
  async getDiscoveryListings(params: {
    q?: string;
    city?: string;
    experienceTags?: string[];
    propertyType?: string;
    dietaryOptions?: string[];
    sort?: 'newest' | 'price-asc' | 'price-desc';
  }) {
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.APPROVED,
    };

    if (params.q?.trim()) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { city: { contains: params.q, mode: 'insensitive' } },
        { state: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.city?.trim()) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }
    if (params.propertyType) {
      where.propertyType = params.propertyType;
    }
    if (params.experienceTags && params.experienceTags.length > 0) {
      where.experienceTags = { hasSome: params.experienceTags };
    }
    if (params.dietaryOptions && params.dietaryOptions.length > 0) {
      where.dietaryOptions = { hasSome: params.dietaryOptions };
    }

    const listings = await this.prisma.listing.findMany({
      where,
      include: {
        rateRules: true,
        media: { orderBy: { sortOrder: 'asc' }, take: 1 },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (params.sort === 'price-asc' || params.sort === 'price-desc') {
      const asc = params.sort === 'price-asc';
      listings.sort((a, b) => {
        const pa = a.rateRules[0]?.baseNightlyRate ?? Number.MAX_SAFE_INTEGER;
        const pb = b.rateRules[0]?.baseNightlyRate ?? Number.MAX_SAFE_INTEGER;
        return asc ? pa - pb : pb - pa;
      });
    }

    return listings;
  }

  async getListingsByBounds(swLat: number, swLng: number, neLat: number, neLng: number) {
    return this.prisma.listing.findMany({
      where: {
        status: ListingStatus.APPROVED,
        AND: [
          { latitude: { not: null } },
          { latitude: { gte: swLat, lte: neLat } },
          { longitude: { not: null } },
          { longitude: { gte: swLng, lte: neLng } },
        ],
      },
      include: { rateRules: true, media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicListingById(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, status: ListingStatus.APPROVED },
      include: {
        rateRules: true,
        media: { orderBy: { sortOrder: 'asc' } },
        seasonalRates: { orderBy: { startsAt: 'asc' } },
        host: { select: { userId: true, user: { select: { fullName: true } } } },
        tags: { include: { tag: true } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async searchListings(q: string) {
    const meiliUrl = this.config.get<string>('MEILI_URL', '');
    const meiliKey = this.config.get<string>('MEILI_MASTER_KEY', '');

    if (q.trim() && meiliUrl) {
      try {
        const res = await fetch(`${meiliUrl}/indexes/listings/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${meiliKey}`,
          },
          body: JSON.stringify({ q: q.trim(), limit: 50 }),
        });
        if (res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = await res.json() as { hits: any[] };
          const ids: string[] = data.hits.map((h: { id: string }) => h.id);
          if (ids.length > 0) {
            return this.prisma.listing.findMany({
              where: { id: { in: ids }, status: ListingStatus.APPROVED },
              include: { rateRules: true, media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
            });
          }
          return [];
        }
      } catch (err) {
        this.logger.warn(`Meilisearch search failed, falling back to DB: ${String(err)}`);
      }
    }

    return this.prisma.listing.findMany({
      where: {
        status: ListingStatus.APPROVED,
        ...(q.trim() ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { state: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { rateRules: true, media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMedia(userId: string, listingId: string, dto: AddMediaDto) {
    await this.verifyOwnership(userId, listingId);
    return this.prisma.listingMedia.create({
      data: { listingId, url: dto.url, mediaType: dto.mediaType, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async deleteMedia(userId: string, listingId: string, mediaId: string) {
    await this.verifyOwnership(userId, listingId);
    const media = await this.prisma.listingMedia.findFirst({ where: { id: mediaId, listingId } });
    if (!media) throw new NotFoundException('Media not found');
    await this.prisma.listingMedia.delete({ where: { id: mediaId } });
    return { deleted: true };
  }

  async addSeasonalRate(userId: string, listingId: string, dto: AddSeasonalRateDto) {
    await this.verifyOwnership(userId, listingId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');
    return this.prisma.seasonalRate.create({
      data: { listingId, startsAt, endsAt, nightlyRate: dto.nightlyRate },
    });
  }

  async getSeasonalRates(userId: string, listingId: string) {
    await this.verifyOwnership(userId, listingId);
    return this.prisma.seasonalRate.findMany({ where: { listingId }, orderBy: { startsAt: 'asc' } });
  }

  async deleteSeasonalRate(userId: string, listingId: string, rateId: string) {
    await this.verifyOwnership(userId, listingId);
    const rate = await this.prisma.seasonalRate.findFirst({ where: { id: rateId, listingId } });
    if (!rate) throw new NotFoundException('Seasonal rate not found');
    await this.prisma.seasonalRate.delete({ where: { id: rateId } });
    return { deleted: true };
  }

  async addAvailabilityBlock(userId: string, listingId: string, dto: AddAvailabilityBlockDto) {
    await this.verifyOwnership(userId, listingId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');
    return this.prisma.availabilityBlock.create({
      data: { listingId, startsAt, endsAt, reason: dto.reason },
    });
  }

  async getAvailabilityBlocks(userId: string, listingId: string) {
    await this.verifyOwnership(userId, listingId);
    return this.prisma.availabilityBlock.findMany({
      where: { listingId },
      orderBy: { startsAt: 'asc' },
    });
  }

  async deleteAvailabilityBlock(userId: string, listingId: string, blockId: string) {
    await this.verifyOwnership(userId, listingId);
    const block = await this.prisma.availabilityBlock.findFirst({ where: { id: blockId, listingId } });
    if (!block) throw new NotFoundException('Availability block not found');
    await this.prisma.availabilityBlock.delete({ where: { id: blockId } });
    return { deleted: true };
  }

  // ─── Tags / Amenities ───────────────────────────────────────────────────────

  async getAllTags() {
    return this.prisma.tag.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  async setListingTags(userId: string, listingId: string, tagIds: string[]) {
    await this.verifyOwnership(userId, listingId);
    // Delete existing, then re-create
    await this.prisma.listingTag.deleteMany({ where: { listingId } });
    if (tagIds.length > 0) {
      const validTags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
      const validIds = validTags.map((t) => t.id);
      await this.prisma.listingTag.createMany({
        data: validIds.map((tagId) => ({ listingId, tagId })),
        skipDuplicates: true,
      });
    }
    return this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { tags: { include: { tag: true } }, rateRules: true },
    });
  }

  async getListingTags(listingId: string) {
    return this.prisma.listingTag.findMany({
      where: { listingId },
      include: { tag: true },
    });
  }

  private async verifyOwnership(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot modify a listing you do not own');
    }
    return listing;
  }

  private async sendListingReviewNotification(
    hostId: string,
    listingId: string,
    listingTitle: string,
    action: 'approve' | 'reject' | 'request_changes',
    note?: string,
  ): Promise<void> {
    try {
      const host = await this.prisma.host.findUnique({
        where: { id: hostId },
        include: { user: { select: { fullName: true, email: true } } },
      });
      if (!host) return;
      if (action === 'approve') {
        await this.notificationService.sendHostListingApproved({
          hostName: host.user.fullName,
          hostEmail: host.user.email,
          listingTitle,
          listingId,
        });
        await this.prisma.hostNotification.create({
          data: {
            hostId,
            type: 'LISTING_APPROVED',
            title: 'Listing approved',
            message: `Your listing "${listingTitle}" is now live on Dhyana Stays.`,
            metadata: { listingId },
          },
        });
      } else if (action === 'reject') {
        await this.notificationService.sendHostListingRejected({
          hostName: host.user.fullName,
          hostEmail: host.user.email,
          listingTitle,
          note,
        });
        await this.prisma.hostNotification.create({
          data: {
            hostId,
            type: action === 'reject' ? 'LISTING_REJECTED' : 'LISTING_CHANGES_REQUESTED',
            title: action === 'reject' ? 'Listing rejected' : 'Changes requested',
            message: `Your listing "${listingTitle}" ${action === 'reject' ? 'was not approved' : 'needs changes'}.${note ? ' Note: ' + note : ''}`,
            metadata: { listingId, note },
          },
        });
      }
    } catch {
      // Non-fatal
    }
  }

  // ─── Preparation Guide ──────────────────────────────────────────────────

  async getPreparationGuide(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot access listing you do not own');
    }
    return { preparationGuide: listing.preparationGuide ?? null };
  }

  async updatePreparationGuide(userId: string, listingId: string, dto: UpdatePreparationDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot edit listing you do not own');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { preparationGuide: dto as object },
      select: { id: true, preparationGuide: true },
    });
    return updated;
  }

  async getPreparationForBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { select: { id: true, title: true, preparationGuide: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) {
      throw new ForbiddenException('Not your booking');
    }
    const confirmedStatuses = ['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'COMPLETED'];
    if (!confirmedStatuses.includes(booking.status)) {
      throw new ForbiddenException('Preparation guide is available only for confirmed bookings');
    }
    return {
      bookingId: booking.id,
      listingTitle: booking.listing.title,
      preparationGuide: booking.listing.preparationGuide ?? null,
    };
  }

  // ─── Property Directions ──────────────────────────────────────────────

  async getDirections(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot access listing you do not own');
    }
    return { propertyDirections: listing.propertyDirections ?? null };
  }

  async updateDirections(userId: string, listingId: string, dto: object) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot edit listing you do not own');
    }
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { propertyDirections: dto },
      select: { id: true, propertyDirections: true },
    });
  }

  // ─── Property Manual ────────────────────────────────────────────────

  async getManual(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot access listing you do not own');
    }
    return { propertyManual: listing.propertyManual ?? null };
  }

  async updateManual(userId: string, listingId: string, dto: object) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.host.userId !== userId) {
      throw new ForbiddenException('Cannot edit listing you do not own');
    }
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { propertyManual: dto },
      select: { id: true, propertyManual: true },
    });
  }

  private isReapprovalTriggered(dto: UpdateListingDto): boolean {
    const sensitiveFields: (keyof UpdateListingDto)[] = ['city', 'state', 'country', 'description'];
    return sensitiveFields.some((field) => dto[field] !== undefined);
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

  private async meiliIndex(listing: {
    id: string; title: string; description: string;
    city: string; state: string; country: string; status: string;
    rateRules?: Array<{ baseNightlyRate: number; maxGuests: number }>;
  }): Promise<void> {
    const meiliUrl = this.config.get<string>('MEILI_URL', '');
    const meiliKey = this.config.get<string>('MEILI_MASTER_KEY', '');
    if (!meiliUrl || !meiliKey) return;
    const rr = listing.rateRules?.[0];
    const doc = {
      id: listing.id, title: listing.title, description: listing.description,
      city: listing.city, state: listing.state, country: listing.country,
      baseNightlyRate: rr?.baseNightlyRate ?? 0, maxGuests: rr?.maxGuests ?? 2,
    };
    try {
      await fetch(`${meiliUrl}/indexes/listings/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${meiliKey}` },
        body: JSON.stringify([doc]),
      });
    } catch (err) {
      this.logger.warn(`Meilisearch index failed for listing ${listing.id}: ${String(err)}`);
    }
  }

  private async meiliDelete(listingId: string): Promise<void> {
    const meiliUrl = this.config.get<string>('MEILI_URL', '');
    const meiliKey = this.config.get<string>('MEILI_MASTER_KEY', '');
    if (!meiliUrl || !meiliKey) return;
    try {
      await fetch(`${meiliUrl}/indexes/listings/documents/${listingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${meiliKey}` },
      });
    } catch (err) {
      this.logger.warn(`Meilisearch delete failed for listing ${listingId}: ${String(err)}`);
    }
  }
}
