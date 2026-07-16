import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationKind =
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'balance.due'
  | 'pay_later.reminder'
  | 'host.listing.approved'
  | 'host.listing.rejected'
  | 'host.new_booking'
  | 'message.received'
  | 'issue.updated'
  | 'sos.ack'
  | 'sip.debit'
  | 'investor.document.uploaded'
  | 'investor.capital_call.opened'
  | 'investor.distribution.paid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

/** Upper bound on retries before a row is marked FAILED. */
const MAX_ATTEMPTS = 5;

/**
 * Backoff schedule: 30s, 2m, 10m, 1h. Attempt N (1-indexed) uses index N-1.
 * Clamped to the last value for any extra retries.
 */
const BACKOFF_SECONDS = [30, 120, 600, 3600];

export interface EnqueueParams {
  userId: string;
  kind: NotificationKind;
  channels: NotificationChannel[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
}

export interface PreferenceBlob {
  channels?: Record<string, Record<string, boolean>>;
  quietHours?: { start: string; end: string; tz?: string };
}

/**
 * OutboxService is the single producer entry point for user notifications.
 * Callers enqueue one row per (channel) — the processor picks them up,
 * checks preferences, dispatches via the channel adapter, and updates
 * status + attempts. A failed attempt schedules a retry via `nextAttemptAt`
 * until MAX_ATTEMPTS.
 *
 * This replaces the old fire-and-forget `this.notificationService.sendX()`
 * pattern: business logic no longer blocks on delivery, and a single
 * downstream outage can't silently swallow messages.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  static backoffSeconds(attempts: number): number {
    const idx = Math.min(attempts, BACKOFF_SECONDS.length - 1);
    return BACKOFF_SECONDS[idx];
  }

  static maxAttempts(): number {
    return MAX_ATTEMPTS;
  }

  /**
   * Persist one outbox row per requested channel. Channels blocked by
   * preferences are written with status=SKIPPED so the audit trail is
   * complete.
   *
   * Supports an optional Prisma transaction so the outbox write is atomic
   * with the triggering business write (e.g. booking confirmation).
   */
  async enqueue(params: EnqueueParams, tx?: TxClient): Promise<void> {
    if (params.channels.length === 0) return;

    const client = tx ?? this.prisma;
    const pref = await this.getPreference(params.userId, client);

    await client.notificationOutbox.createMany({
      data: params.channels.map((channel) => {
        const allowed = this.isChannelAllowed(pref, params.kind, channel);
        return {
          userId: params.userId,
          kind: params.kind,
          channel,
          payload: params.payload as unknown as Prisma.InputJsonValue,
          status: allowed ? OutboxStatus.PENDING : OutboxStatus.SKIPPED,
        };
      }),
    });
  }

  /** Fetch pending outbox rows whose nextAttemptAt is past. */
  async claimPending(now: Date = new Date(), limit = 50) {
    return this.prisma.notificationOutbox.findMany({
      where: {
        status: OutboxStatus.PENDING,
        nextAttemptAt: { lte: now },
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /** Mark a row SENT. */
  async markSent(id: string): Promise<void> {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: { status: OutboxStatus.SENT, sentAt: new Date() },
    });
  }

  /**
   * Record a failed attempt. Marks FAILED once MAX_ATTEMPTS is reached,
   * otherwise schedules the next attempt via exponential backoff.
   */
  async recordFailure(id: string, error: string): Promise<void> {
    const row = await this.prisma.notificationOutbox.findUnique({
      where: { id },
      select: { attempts: true },
    });
    if (!row) return;
    const attempts = row.attempts + 1;
    const done = attempts >= MAX_ATTEMPTS;
    const nextAttemptAt = new Date(
      Date.now() + OutboxService.backoffSeconds(attempts) * 1000,
    );
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: {
        attempts,
        lastError: error.slice(0, 500),
        status: done ? OutboxStatus.FAILED : OutboxStatus.PENDING,
        nextAttemptAt,
      },
    });
    if (done) {
      this.logger.warn(
        `Outbox ${id} exhausted ${MAX_ATTEMPTS} attempts — marking FAILED`,
      );
    }
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  async getPreference(userId: string, tx?: TxClient): Promise<PreferenceBlob> {
    const client = tx ?? this.prisma;
    const row = await client.notificationPreference.findUnique({
      where: { userId },
    });
    return (row?.channels as PreferenceBlob['channels']) || row
      ? {
          channels:
            (row?.channels as PreferenceBlob['channels']) ?? undefined,
          quietHours: (row?.quietHours as PreferenceBlob['quietHours']) ?? undefined,
        }
      : {};
  }

  async upsertPreference(
    userId: string,
    channels: PreferenceBlob['channels'],
    quietHours?: PreferenceBlob['quietHours'],
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        channels: (channels ?? {}) as unknown as Prisma.InputJsonValue,
        quietHours: quietHours
          ? (quietHours as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      update: {
        channels: (channels ?? {}) as unknown as Prisma.InputJsonValue,
        quietHours: quietHours
          ? (quietHours as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  /**
   * Default-allow: unless a user has explicitly opted out of
   * (kind, channel), the row is PENDING. Transactional messages like
   * booking.confirmed and sos.ack cannot be opted out of — they're always
   * sent on any channel the caller requested.
   */
  private isChannelAllowed(
    pref: PreferenceBlob,
    kind: NotificationKind,
    channel: NotificationChannel,
  ): boolean {
    const transactional: NotificationKind[] = [
      'booking.confirmed',
      'booking.cancelled',
      'sos.ack',
    ];
    if (transactional.includes(kind)) return true;
    const kindPref = pref.channels?.[kind];
    if (!kindPref) return true; // no opt-out recorded
    const key = channel.toLowerCase();
    return kindPref[key] !== false;
  }
}
