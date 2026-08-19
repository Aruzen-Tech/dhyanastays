import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdvertisementDto, UpdateAdvertisementDto } from './dto/advertisement.dto';

/** The public popup payload — no counters or scheduling internals leak out. */
export interface PublicAdvertisement {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  accentColor: string | null;
  frequency: string;
  placement: string;
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
    });
    return ads.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      imageUrl: a.imageUrl,
      ctaLabel: a.ctaLabel,
      ctaHref: a.ctaHref,
      accentColor: a.accentColor,
      frequency: a.frequency,
      placement: a.placement,
    }));
  }

  /** Admin list — every ad with its counters + schedule, newest priority first. */
  listAll() {
    return this.prisma.advertisement.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
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
