import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { ThemeService } from '../theme/theme.service';
import { LAUNCH_THEMES_BY_ID, ThemeBundle } from '../theme/themes.registry';

/**
 * The Stay Passport (spec §7): a guest's profile becomes a passport whose pages
 * are their stays. Two-phase per stamp:
 *   - ENTRY   — minted at VERIFIED check-in (QR scan)     → checkedInAt set
 *   - SEALED  — stamped at successful check-out (COMPLETED) → completedAt set
 *
 * Never-scanned stays still earn a sealed stamp at completion (backstop) so
 * every completed stay is recorded exactly once (unique on bookingId).
 *
 * This module owns only its stamps; it never writes Booking state.
 */
@Injectable()
export class PassportService {
  private readonly logger = new Logger(PassportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly themes: ThemeService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Mint (or update) the ENTRY stamp on verified check-in. Idempotent:
   * one row per booking; a re-scan just refreshes checkedInAt.
   */
  async mintOnCheckin(bookingId: string): Promise<void> {
    const snap = await this.stampFacts(bookingId);
    if (!snap) return;

    await this.prisma.passportStamp.upsert({
      where: { bookingId },
      create: {
        guestId: snap.guestId,
        bookingId,
        themeId: snap.themeId,
        propertyName: snap.propertyName,
        city: snap.city,
        stayStart: snap.stayStart,
        stayEnd: snap.stayEnd,
        nights: snap.nights,
        checkedInAt: new Date(),
      },
      update: { checkedInAt: new Date() },
    });

    await this.audit.log(null, 'PASSPORT_STAMP_ENTRY', 'passport_stamp', bookingId, {
      guestId: snap.guestId,
      themeId: snap.themeId,
    });
  }

  /**
   * Seal the stamp at successful check-out (booking COMPLETED). If the stay was
   * never scanned, this also creates the stamp (backstop). Idempotent.
   * Returns true when it newly sealed a stamp.
   */
  async sealOnComplete(bookingId: string): Promise<boolean> {
    const existing = await this.prisma.passportStamp.findUnique({ where: { bookingId } });
    if (existing?.completedAt) return false; // already sealed

    const snap = await this.stampFacts(bookingId);
    if (!snap) return false;

    const now = new Date();
    await this.prisma.passportStamp.upsert({
      where: { bookingId },
      create: {
        guestId: snap.guestId,
        bookingId,
        themeId: snap.themeId,
        propertyName: snap.propertyName,
        city: snap.city,
        stayStart: snap.stayStart,
        stayEnd: snap.stayEnd,
        nights: snap.nights,
        checkedInAt: null, // never scanned
        completedAt: now,
      },
      update: { completedAt: now },
    });

    await this.audit.log(null, 'PASSPORT_STAMP_SEALED', 'passport_stamp', bookingId, {
      guestId: snap.guestId,
      themeId: snap.themeId,
      wasScanned: !!existing?.checkedInAt,
    });
    return true;
  }

  /**
   * Backstop sweep: seal stamps for any COMPLETED booking whose stamp isn't
   * sealed yet (covers auto-complete of never-scanned stays). Called from the
   * ticket-render sweep. Batch-limited, idempotent.
   */
  async sealCompletedSweep(limit = 20): Promise<number> {
    const completed = await this.prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        ticket: { isNot: null }, // scope to Stay-Pass-era stays
      },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    let sealed = 0;
    for (const b of completed) {
      if (await this.sealOnComplete(b.id)) sealed++;
    }
    return sealed;
  }

  /** The passport spread for a guest's profile (spec §7.1). */
  async getPassport(guestId: string) {
    const stamps = await this.prisma.passportStamp.findMany({
      where: { guestId },
      orderBy: { mintedAt: 'desc' },
    });

    const themeIds = [...new Set(stamps.map((s) => s.themeId))];
    const distinctThemes = themeIds.length;
    const totalNights = stamps.reduce((sum, s) => sum + s.nights, 0);

    // "The Curator's Circuit" launch set: all five core stay types.
    const CORE_TYPES = ['forest_villa', 'heritage', 'beachfront', 'treehouse', 'retreat'];
    const collectedCore = CORE_TYPES.filter((t) => themeIds.includes(t));

    return {
      stats: {
        totalStamps: stamps.length,
        sealedStamps: stamps.filter((s) => s.completedAt).length,
        totalNights,
        distinctThemes,
      },
      collections: [
        {
          id: 'curators_circuit',
          name: "The Curator's Circuit",
          description: 'Stay at all five core sanctuaries.',
          required: CORE_TYPES.length,
          collected: collectedCore.length,
          complete: collectedCore.length === CORE_TYPES.length,
          missing: CORE_TYPES.filter((t) => !themeIds.includes(t)).map((t) => ({
            themeId: t,
            displayName: this.themeName(t),
          })),
        },
      ],
      stamps: stamps.map((s) => ({
        id: s.id,
        bookingId: s.bookingId,
        themeId: s.themeId,
        theme: this.themeName(s.themeId),
        stampShape: this.stampShape(s.themeId),
        propertyName: s.propertyName,
        city: s.city,
        nights: s.nights,
        stayStart: s.stayStart,
        stayEnd: s.stayEnd,
        checkedInAt: s.checkedInAt,
        completedAt: s.completedAt,
        state: s.completedAt ? 'SEALED' : s.checkedInAt ? 'ENTRY' : 'PENDING',
        memoryLine: `${s.nights} night${s.nights === 1 ? '' : 's'} · ${new Date(
          s.stayStart,
        ).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
      })),
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async stampFacts(bookingId: string): Promise<{
    guestId: string;
    themeId: string;
    propertyName: string;
    city: string;
    stayStart: Date;
    stayEnd: Date;
    nights: number;
  } | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { select: { title: true, city: true } } },
    });
    if (!booking) return null;
    const theme = await this.themes.resolveForListing(booking.listingId);
    return {
      guestId: booking.guestId,
      themeId: theme.id,
      propertyName: booking.listing.title,
      city: booking.listing.city,
      stayStart: booking.startsAt,
      stayEnd: booking.endsAt,
      nights: Math.max(
        1,
        Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 86400000),
      ),
    };
  }

  private theme(themeId: string): ThemeBundle | undefined {
    return LAUNCH_THEMES_BY_ID[themeId];
  }
  private themeName(themeId: string): string {
    return this.theme(themeId)?.displayName ?? themeId.replace(/_/g, ' ');
  }
  private stampShape(themeId: string): string {
    return this.theme(themeId)?.tokens.stamp_shape ?? 'hex';
  }
}
