import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddSpotlightDto, UpdateSpotlightDto } from './dto/spotlight.dto';

/**
 * The public card shape consumed by the homepage Stay Spotlight carousel.
 * Intentionally matches the web `PromotedStay` interface so the front-end can
 * swap the mock array for this feed with no downstream changes.
 */
export interface PublicSpotlightStay {
  id: string;
  listingId: string;
  title: string;
  location: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  media: { url: string; mediaType: string }[];
  nightlyRate: number;
  rating: number;
  reviewCount: number;
  badge: string;
}

const LISTING_CARD_INCLUDE = {
  rateRules: { orderBy: { createdAt: 'asc' as const }, take: 1 },
  media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
} satisfies Prisma.ListingInclude;

/** First uploaded image url, if any. */
function coverOf(media: { url: string; mediaType: string }[]): string | null {
  return media.find((m) => m.mediaType.startsWith('image'))?.url ?? null;
}
function firstVideoOf(media: { url: string; mediaType: string }[]): string | null {
  return media.find((m) => m.mediaType.startsWith('video'))?.url ?? null;
}
function mediaCounts(media: { mediaType: string }[]) {
  let images = 0;
  let videos = 0;
  for (const m of media) {
    if (m.mediaType.startsWith('video')) videos += 1;
    else images += 1;
  }
  return { images, videos };
}

@Injectable()
export class SpotlightService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregate avg rating + review count for a set of listings. */
  private async ratingsFor(listingIds: string[]): Promise<Map<string, { rating: number; reviewCount: number }>> {
    const map = new Map<string, { rating: number; reviewCount: number }>();
    if (listingIds.length === 0) return map;
    const grouped = await this.prisma.review.groupBy({
      by: ['listingId'],
      where: { listingId: { in: listingIds } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    for (const g of grouped) {
      map.set(g.listingId, {
        rating: g._avg.rating ? Math.round(g._avg.rating * 10) / 10 : 0,
        reviewCount: g._count._all,
      });
    }
    return map;
  }

  /**
   * Public feed: active spotlights whose listing is still APPROVED, ordered for
   * the carousel and joined to live listing data.
   */
  async getPublicFeed(): Promise<PublicSpotlightStay[]> {
    const rows = await this.prisma.spotlightStay.findMany({
      where: { isActive: true, listing: { status: ListingStatus.APPROVED } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        listing: { include: LISTING_CARD_INCLUDE },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });
    const ratings = await this.ratingsFor(rows.map((r) => r.listingId));
    return rows.map((r) => {
      const agg = ratings.get(r.listingId) ?? { rating: 0, reviewCount: 0 };
      // Prefer the spotlight's own uploaded cover; fall back to the listing photo.
      const cover = coverOf(r.media) ?? r.listing.media[0]?.url ?? null;
      return {
        id: r.id,
        listingId: r.listingId,
        title: r.listing.title,
        location: [r.listing.city, r.listing.state].filter(Boolean).join(', '),
        description: r.tagline?.trim() || r.listing.description,
        imageUrl: cover,
        videoUrl: firstVideoOf(r.media),
        media: r.media.map((m) => ({ url: m.url, mediaType: m.mediaType })),
        nightlyRate: r.listing.rateRules[0]?.baseNightlyRate ?? 0,
        rating: agg.rating,
        reviewCount: agg.reviewCount,
        badge: r.badge?.trim() || 'Featured Stay',
      };
    });
  }

  /** Admin list: every spotlight row (active or not) with a listing summary. */
  async listAll() {
    const rows = await this.prisma.spotlightStay.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        listing: { include: LISTING_CARD_INCLUDE },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });
    const ratings = await this.ratingsFor(rows.map((r) => r.listingId));
    return rows.map((r) => {
      const agg = ratings.get(r.listingId) ?? { rating: 0, reviewCount: 0 };
      const counts = mediaCounts(r.media);
      return {
        id: r.id,
        listingId: r.listingId,
        badge: r.badge,
        tagline: r.tagline,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
        createdAt: r.createdAt,
        media: r.media.map((m) => ({ id: m.id, url: m.url, mediaType: m.mediaType, sortOrder: m.sortOrder })),
        imageCount: counts.images,
        videoCount: counts.videos,
        listing: {
          id: r.listing.id,
          title: r.listing.title,
          location: [r.listing.city, r.listing.state].filter(Boolean).join(', '),
          status: r.listing.status,
          imageUrl: r.listing.media[0]?.url ?? null,
          nightlyRate: r.listing.rateRules[0]?.baseNightlyRate ?? 0,
          rating: agg.rating,
          reviewCount: agg.reviewCount,
        },
      };
    });
  }

  async add(dto: AddSpotlightDto, adminUserId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const existing = await this.prisma.spotlightStay.findUnique({
      where: { listingId: dto.listingId },
    });
    if (existing) throw new BadRequestException('This listing is already in the spotlight');

    const last = await this.prisma.spotlightStay.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    return this.prisma.spotlightStay.create({
      data: {
        listingId: dto.listingId,
        badge: dto.badge?.trim() || null,
        tagline: dto.tagline?.trim() || null,
        sortOrder,
        createdById: adminUserId,
      },
    });
  }

  async update(id: string, dto: UpdateSpotlightDto) {
    await this.ensureExists(id);
    return this.prisma.spotlightStay.update({
      where: { id },
      data: {
        ...(dto.badge !== undefined ? { badge: dto.badge.trim() || null } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async addMedia(spotlightId: string, dto: { url: string; mediaType: string; sortOrder?: number }) {
    await this.ensureExists(spotlightId);
    return this.prisma.spotlightMedia.create({
      data: {
        spotlightId,
        url: dto.url,
        mediaType: dto.mediaType,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async deleteMedia(spotlightId: string, mediaId: string) {
    const row = await this.prisma.spotlightMedia.findUnique({ where: { id: mediaId } });
    if (!row || row.spotlightId !== spotlightId) throw new NotFoundException('Media not found');
    await this.prisma.spotlightMedia.delete({ where: { id: mediaId } });
    return { ok: true };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.spotlightStay.delete({ where: { id } });
    return { ok: true };
  }

  /** Persist a new display order; `ids` are spotlight row ids top-to-bottom. */
  async reorder(ids: string[]) {
    const rows = await this.prisma.spotlightStay.findMany({ select: { id: true } });
    const known = new Set(rows.map((r) => r.id));
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      throw new BadRequestException('Reorder list must contain every spotlight id exactly once');
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.spotlightStay.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return this.listAll();
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.spotlightStay.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Spotlight entry not found');
  }
}
