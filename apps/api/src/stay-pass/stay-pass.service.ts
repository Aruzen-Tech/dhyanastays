import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../common/services/audit.service';
import { FeatureFlagService } from '../feature/feature-flag.service';
import { ThemeService } from './theme/theme.service';
import { PassportService } from './passport/passport.service';
import { QrTokenSignerService } from './qr/qr-token.signer';
import {
  renderAll,
  RenderContext,
  TEMPLATE_VERSION,
} from './ticket/render/ticket-renderer';

/**
 * Stay Pass orchestrator (spec §1): creates the Ticket row for a confirmed
 * booking, resolves its theme, renders every format, uploads to storage, and
 * maintains the ticket lifecycle (void on cancel).
 *
 * Integration seam: rather than hooking the synchronous confirm path, a
 * reconciliation sweep (BullMQ `ticket-render`, every 30s — same pattern as the
 * notification outbox) picks up confirmed bookings without a rendered ticket.
 * Idempotent by construction: deterministic renders + content-addressed keys +
 * one Ticket row per booking. A late ticket is a follow-up touch, never a
 * blocker (spec §3.4).
 */

const CONFIRMED_STATUSES = [
  'CONFIRMED_PAID',
  'CONFIRMED_DEPOSIT',
  'BALANCE_DUE',
  'CHECKED_IN',
] as const;

const VOIDABLE_STATUSES = ['CANCELLED', 'REFUNDED'] as const;

@Injectable()
export class StayPassService {
  private readonly logger = new Logger(StayPassService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly themes: ThemeService,
    private readonly qrSigner: QrTokenSignerService,
    private readonly audit: AuditService,
    private readonly featureFlags: FeatureFlagService,
    private readonly passport: PassportService,
  ) {}

  /**
   * One sweep pass (called by the ticket-render processor):
   *  1. confirmed bookings without a Ticket → create + render
   *  2. tickets stuck PENDING/FAILED → (re)render
   *  3. cancelled bookings with a live ticket → void + revoke QR
   * Batch-limited; every step is independently idempotent.
   */
  async sweep(limit = 10): Promise<{ rendered: number; voided: number; failed: number }> {
    // Same gate as the HTTP surface — a disabled feature renders nothing.
    if (!(await this.featureFlags.isEnabled('stay_pass'))) {
      return { rendered: 0, voided: 0, failed: 0 };
    }
    let rendered = 0;
    let voided = 0;
    let failed = 0;

    // 1+2 — bookings needing a render.
    const needingRender = await this.prisma.booking.findMany({
      where: {
        status: { in: [...CONFIRMED_STATUSES] },
        OR: [{ ticket: null }, { ticket: { status: { in: ['PENDING', 'FAILED'] } } }],
      },
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
    for (const b of needingRender) {
      try {
        await this.renderTicketForBooking(b.id);
        rendered++;
      } catch (err) {
        failed++;
        this.logger.error(
          `Ticket render failed for booking ${b.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        await this.prisma.ticket
          .updateMany({ where: { bookingId: b.id }, data: { status: 'FAILED' } })
          .catch(() => {});
      }
    }

    // 3 — voids.
    const toVoid = await this.prisma.ticket.findMany({
      where: {
        status: { notIn: ['VOIDED'] },
        booking: { status: { in: [...VOIDABLE_STATUSES] } },
      },
      select: { id: true, bookingId: true },
      take: limit,
    });
    for (const t of toVoid) {
      await this.voidTicket(t.bookingId);
      voided++;
    }

    // Backstop: seal passport stamps for completed stays (covers auto-complete
    // of never-scanned bookings — every completed stay earns its stamp).
    const sealed = await this.passport.sealCompletedSweep(limit).catch((err) => {
      this.logger.warn(
        `passport seal sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 0;
    });

    if (rendered || voided || failed || sealed) {
      this.logger.log(
        `Stay Pass sweep: rendered=${rendered} voided=${voided} sealed=${sealed} failed=${failed}`,
      );
    }
    return { rendered, voided, failed };
  }

  /**
   * Idempotently ensure the Ticket row exists, then render all formats and
   * write the asset manifest. Deterministic: replays overwrite identical bytes.
   */
  async renderTicketForBooking(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { id: true, title: true, city: true, state: true } },
        guest: { select: { fullName: true } },
      },
    });
    if (!booking) return;
    if (!CONFIRMED_STATUSES.includes(booking.status as never)) return;

    const theme = await this.themes.resolveForListing(booking.listingId);

    // Ensure the Ticket row (mints the single-issue QR jti exactly once).
    let ticket = await this.prisma.ticket.findUnique({ where: { bookingId } });
    if (!ticket) {
      ticket = await this.prisma.ticket
        .create({
          data: {
            bookingId,
            themeId: theme.id,
            themeVersion: theme.version,
            templateVersion: TEMPLATE_VERSION,
            qrJti: randomUUID(),
          },
        })
        .catch(async (err) => {
          // Unique race with a concurrent sweep — re-read.
          const existing = await this.prisma.ticket.findUnique({ where: { bookingId } });
          if (existing) return existing;
          throw err;
        });
    }

    const qrToken = this.qrSigner.sign({
      bookingId,
      jti: ticket.qrJti,
      checkIn: booking.startsAt,
      checkOut: booking.endsAt,
    });

    const fullName = booking.guest.fullName?.trim() || 'Guest';
    const snapshot = booking.priceSnapshot as { guests?: number } | null;
    const ctx: RenderContext = {
      ticketId: ticket.id,
      templateVersion: TEMPLATE_VERSION,
      theme,
      edition: null, // editions land in a later phase (schema is ready)
      booking: {
        refShort: `DS-${bookingId.slice(-8).toUpperCase()}`,
        propertyName: booking.listing.title,
        locationLine: `${booking.listing.city}, ${booking.listing.state}`,
        guestDisplayName: fullName,
        guestFirstName: fullName.split(/\s+/)[0],
        checkInDate: booking.startsAt.toISOString().slice(0, 10),
        checkInTime: '14:00',
        checkOutDate: booking.endsAt.toISOString().slice(0, 10),
        checkOutTime: '11:00',
        nights: Math.max(
          1,
          Math.round(
            (booking.endsAt.getTime() - booking.startsAt.getTime()) / 86400000,
          ),
        ),
        guests: snapshot?.guests ?? 2,
        curatedBadge: true,
      },
      qrToken,
    };

    const assets = await renderAll(ctx);

    const base = `tickets/${bookingId}/${TEMPLATE_VERSION}`;
    const manifest: Record<string, { key: string; url: string }> = {};
    const uploads: Array<[string, Buffer, string, string]> = [
      ['og', assets.og, 'image/png', `${base}/og.png`],
      ['story', assets.story, 'image/png', `${base}/story.png`],
      ['hero', assets.hero, 'image/png', `${base}/hero.png`],
      ['full', assets.full, 'image/png', `${base}/full.png`],
      ['pdf', assets.pdf, 'application/pdf', `${base}/voucher.pdf`],
    ];
    for (const [format, bytes, mime, key] of uploads) {
      const { publicUrl } = await this.storage.putObject(key, bytes, mime);
      manifest[format] = { key, url: publicUrl };
    }

    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'RENDERED',
        themeId: theme.id,
        themeVersion: theme.version,
        assets: manifest,
      },
    });

    await this.audit.log(null, 'STAY_PASS_RENDERED', 'ticket', ticket.id, {
      bookingId,
      themeId: theme.id,
      themeVersion: theme.version,
      templateVersion: TEMPLATE_VERSION,
      formats: Object.keys(manifest),
    });
  }

  /** Void the ticket + revoke its QR (cancel/refund path). Idempotent. */
  async voidTicket(bookingId: string): Promise<void> {
    const res = await this.prisma.ticket.updateMany({
      where: { bookingId, status: { not: 'VOIDED' } },
      data: { status: 'VOIDED', qrRevoked: true },
    });
    if (res.count > 0) {
      await this.audit.log(null, 'STAY_PASS_VOIDED', 'ticket', bookingId, {
        bookingId,
      });
    }
  }

  /** Ticket + manifest for the booking page (owner/admin enforced by caller). */
  async getTicket(bookingId: string) {
    return this.prisma.ticket.findUnique({ where: { bookingId } });
  }
}
