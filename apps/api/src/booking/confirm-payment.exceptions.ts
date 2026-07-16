import { ConflictException } from '@nestjs/common';

/**
 * Thrown when the HMAC on `Booking.priceSnapshot.hmac` does not verify at
 * confirm time.
 *
 * Critical clarification (do not "optimize" the re-check away as redundant):
 * This is NOT defending against client tampering — that is stopped at
 * quote → hold creation. This defends against any path that wrote to
 * `Booking.priceSnapshot` between quote and confirm: a bug in admin tooling,
 * a migration with bad data, a compromised internal account, etc. Re-verifying
 * at confirm closes a category of bugs that aren't visible until they happen.
 */
export class TamperedSnapshotException extends ConflictException {
  constructor(bookingId: string) {
    super({
      statusCode: 409,
      error: 'TamperedSnapshot',
      message: `Price snapshot HMAC failed verification for booking ${bookingId}. Payment refused.`,
      bookingId,
    });
  }
}

/**
 * Thrown when the captured amount from Razorpay does not match the expected
 * amount for the Payment row (FULL/DEPOSIT/BALANCE/PAY_LATER seq).
 *
 * Expected amount lookup is plan-aware:
 *   - FULL              → snapshot.total
 *   - DEPOSIT_50 deposit → snapshot.depositAmount
 *   - DEPOSIT_50 balance → snapshot.balanceAmount
 *   - PAY_LATER seq=1   → first instalment (from payLaterFirstInstalment array)
 *   - PAY_LATER seq>1   → PayLaterInstalment.amountMinor for that seq
 */
export class AmountMismatchException extends ConflictException {
  constructor(
    public readonly capturedPaise: number,
    public readonly expectedPaise: number,
    public readonly bookingId: string,
    public readonly paymentId: string,
  ) {
    super({
      statusCode: 409,
      error: 'AmountMismatch',
      message: `Captured amount ${capturedPaise} paise does not match expected ${expectedPaise} paise for payment ${paymentId}.`,
      bookingId,
      paymentId,
      capturedPaise,
      expectedPaise,
    });
  }
}
