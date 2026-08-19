import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdvertisementDto, UpdateAdvertisementDto } from './dto/advertisement.dto';

/** The public billboard payload — no counters or scheduling internals leak out. */
export interface PublicAdvertisement {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  media: { url: string; mediaType: string }[];
  ctaLabel: string | null;
  ctaHref: string | null;
  accentColor: string | null;
  frequency: string;
  placement: string;
}

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

/** Empty string / whitespace → null; otherwise a Date (invalid → null). */
function parseDate(value?: string): Date | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class AdvertisementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public feed for a placement: active ads whose optional schedule window
   * currently includes `now`, highest priority first. Records nothing — the
   * caller reports an impression once it actually shows one.
   */
  async getActive(placement = 'explore_billboard'): Promise<PublicAdvertisement[]> {
    const now = new Date();
    const ads = await this.prisma.advertisement.findMany({
      where: {
        placement,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });
    return ads.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      // Prefer the uploaded cover image; fall back to the legacy imageUrl field.
      imageUrl: coverOf(a.media) ?? a.imageUrl,
      videoUrl: firstVideoOf(a.media),
      media: a.media.map((m) => ({ url: m.url, mediaType: m.mediaType })),
      ctaLabel: a.ctaLabel,
      ctaHref: a.ctaHref,
      accentColor: a.accentColor,
      frequency: a.frequency,
      placement: a.placement,
    }));
  }

  /** Admin list — every ad with counters, schedule + media, newest priority first. */
  async listAll() {
    const ads = await this.prisma.advertisement.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });
    return ads.map((a) => {
      const counts = mediaCounts(a.media);
      return { ...a, imageCount: counts.images, videoCount: counts.videos };
    });
  }

  create(dto: CreateAdvertisementDto, adminUserId: string) {
    return this.prisma.advertisement.create({
      data: {
        title: dto.title.trim(),
        body: dto.body?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        ctaLabel: dto.ctaLabel?.trim() || null,
        ctaHref: dto.ctaHref?.trim() || null,
        placement: dto.placement ?? 'explore_billboard',
        frequency: dto.frequency ?? 'session',
        accentColor: dto.accentColor ?? null,
        isActive: dto.isActive ?? true,
        startsAt: parseDate(dto.startsAt),
        endsAt: parseDate(dto.endsAt),
        priority: dto.priority ?? 0,
        createdById: adminUserId,
      },
    });
  }

  async update(id: string, dto: UpdateAdvertisementDto) {
    await this.ensureExists(id);
    const data: Prisma.AdvertisementUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.body !== undefined) data.body = dto.body.trim() || null;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl.trim() || null;
    if (dto.ctaLabel !== undefined) data.ctaLabel = dto.ctaLabel.trim() || null;
    if (dto.ctaHref !== undefined) data.ctaHref = dto.ctaHref.trim() || null;
    if (dto.placement !== undefined) data.placement = dto.placement;
    if (dto.frequency !== undefined) data.frequency = dto.frequency;
    if (dto.accentColor !== undefined) data.accentColor = dto.accentColor || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.startsAt !== undefined) data.startsAt = parseDate(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = parseDate(dto.endsAt);
    if (dto.priority !== undefined) data.priority = dto.priority;
    return this.prisma.advertisement.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.advertisement.delete({ where: { id } });
    return { ok: true };
  }

  async addMedia(advertisementId: string, dto: { url: string; mediaType: string; sortOrder?: number }) {
    await this.ensureExists(advertisementId);
    return this.prisma.advertisementMedia.create({
      data: {
        advertisementId,
        url: dto.url,
        mediaType: dto.mediaType,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async deleteMedia(advertisementId: string, mediaId: string) {
    const row = await this.prisma.advertisementMedia.findUnique({ where: { id: mediaId } });
    if (!row || row.advertisementId !== advertisementId) throw new NotFoundException('Media not found');
    await this.prisma.advertisementMedia.delete({ where: { id: mediaId } });
    return { ok: true };
  }

  /** Fire-and-forget counters — never throw on a stale id from the client. */
  async recordImpression(id: string) {
    await this.prisma.advertisement.updateMany({
      where: { id },
      data: { impressionCount: { increment: 1 } },
    });
    return { ok: true };
  }

  async recordClick(id: string) {
    await this.prisma.advertisement.updateMany({
      where: { id },
      data: { clickCount: { increment: 1 } },
    });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Advertisement not found');
  }
}
