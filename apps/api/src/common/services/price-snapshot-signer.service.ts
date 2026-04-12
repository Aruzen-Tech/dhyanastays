import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signs and verifies price snapshots using HMAC-SHA256.
 *
 * Prevents price tampering between quote generation and payment processing.
 * The HMAC covers all financial fields so any modification is detectable.
 */
@Injectable()
export class PriceSnapshotSignerService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>(
      'PRICE_SNAPSHOT_SECRET',
      'dev-snapshot-secret-min-32-characters!',
    );
  }

  /** Produce an HMAC-SHA256 hex digest over the snapshot's financial fields. */
  sign(snapshot: Record<string, unknown>): string {
    const payload = this.canonicalize(snapshot);
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  /** Verify a snapshot's HMAC. Returns true if valid, false if tampered. */
  verify(snapshot: Record<string, unknown>, hmac: string): boolean {
    const expected = this.sign(snapshot);
    if (expected.length !== hmac.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hmac));
  }

  /**
   * Build a deterministic string from the financial fields of a price snapshot.
   * Only includes fields that affect pricing — excludes the hmac itself.
   */
  private canonicalize(snapshot: Record<string, unknown>): string {
    const fields = [
      'listingId',
      'checkIn',
      'checkOut',
      'nights',
      'guests',
      'subtotal',
      'cleaningFee',
      'platformFee',
      'total',
      'depositAmount',
      'balanceAmount',
      'currency',
      'snapshotAt',
    ];
    const parts = fields.map((f) => `${f}=${JSON.stringify(snapshot[f] ?? '')}`);
    return parts.join('|');
  }
}
