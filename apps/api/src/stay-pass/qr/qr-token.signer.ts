import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signed check-in token for the Stay Pass QR.
 *
 * Mirrors PriceSnapshotSignerService's discipline (HMAC-SHA256, dedicated
 * secret, timing-safe compare) but for a compact self-describing token:
 *
 *   token = base64url(payload) + "." + base64url(HMAC_SHA256(k_qr, payload))
 *
 * Scanning the token grants nothing by itself — verification is always
 * server-side (see CheckinService). `v` supports key/schema rollover.
 */
export interface CheckinTokenPayload {
  v: number; // token schema version
  bid: string; // booking id
  typ: 'checkin';
  nbf: number; // not-valid-before (unix seconds) — check-in date − 24h
  exp: number; // not-valid-after  (unix seconds) — check-out date + 24h
  jti: string; // single-issue id (matches Ticket.qrJti), supports revocation
}

export type TokenVerifyResult =
  | { ok: true; payload: CheckinTokenPayload }
  | { ok: false; reason: 'MALFORMED' | 'INVALID_SIG' };

const CURRENT_VERSION = 1;

@Injectable()
export class QrTokenSignerService {
  private readonly logger = new Logger(QrTokenSignerService.name);
  private readonly secret: string;

  constructor(config: ConfigService) {
    // Falls back to the price-snapshot secret in dev so tickets work without
    // extra config; production env-validation requires a dedicated QR secret.
    this.secret =
      config.get<string>('QR_SIGNING_SECRET') ||
      config.get<string>('PRICE_SNAPSHOT_SECRET') ||
      'dev-qr-secret-min-32-characters-placeholder!';
  }

  /** Build + sign a check-in token. */
  sign(input: {
    bookingId: string;
    jti: string;
    checkIn: Date;
    checkOut: Date;
  }): string {
    const payload: CheckinTokenPayload = {
      v: CURRENT_VERSION,
      bid: input.bookingId,
      typ: 'checkin',
      nbf: Math.floor(input.checkIn.getTime() / 1000) - 24 * 3600,
      exp: Math.floor(input.checkOut.getTime() / 1000) + 24 * 3600,
      jti: input.jti,
    };
    const body = this.b64url(JSON.stringify(payload));
    const sig = this.b64url(this.hmac(body));
    return `${body}.${sig}`;
  }

  /** Verify signature + shape. Time-window / revocation / state are checked by the caller. */
  verify(token: string): TokenVerifyResult {
    const parts = token.split('.');
    if (parts.length !== 2) return { ok: false, reason: 'MALFORMED' };
    const [body, sig] = parts;

    const expected = this.b64url(this.hmac(body));
    // timing-safe: compare equal-length buffers only
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'INVALID_SIG' };
    }

    let payload: CheckinTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      return { ok: false, reason: 'MALFORMED' };
    }
    if (payload?.typ !== 'checkin' || !payload.bid || !payload.jti) {
      return { ok: false, reason: 'MALFORMED' };
    }
    return { ok: true, payload };
  }

  private hmac(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('hex');
  }

  private b64url(s: string): string {
    return Buffer.from(s).toString('base64url');
  }
}
