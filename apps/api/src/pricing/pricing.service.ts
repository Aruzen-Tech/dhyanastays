import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriceSnapshotSignerService } from '../common/services/price-snapshot-signer.service';
import { AddOnService } from '../add-on/add-on.service';
import {
  MembershipService,
  TIER_DISCOUNT_RATE,
} from '../membership/membership.service';
import { PriceSnapshot, QuoteDto } from './dto/quote.dto';

export const PLATFORM_FEE_RATE = 0.10; // 10% platform commission

// GST 18% on platform's electronic-commerce service revenue (platform fee + add-on commission).
// Host is responsible for their own GST on accommodation revenue.
export const GST_RATE = 0.18;

// Snapshot validity window — 30 minutes from quote time.
// Past this, hold/payment endpoints reject the snapshot to prevent stale-price attacks.
export const SNAPSHOT_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotSigner: PriceSnapshotSignerService,
    private readonly addOnService: AddOnService,
    private readonly membershipService: MembershipService,
  ) {}

  async quote(dto: QuoteDto): Promise<PriceSnapshot> {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkIn >= checkOut) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const nights = this.diffDays(checkIn, checkOut);
    if (nights < 1) {
      throw new BadRequestException('Minimum stay is 1 night');
    }

    const listing = await this.prisma.listing.findFirst({
      where: { id: dto.listingId, status: 'APPROVED' },
      include: {
        rateRules: true,
        seasonalRates: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or not available');
    }

    const rateRule = listing.rateRules[0];
    if (!rateRule) {
      throw new BadRequestException('Listing has no rate configured');
    }

    if (dto.guests > rateRule.maxGuests) {
      throw new BadRequestException(
        `Listing supports max ${rateRule.maxGuests} guests`,
      );
    }

    if (nights < rateRule.minNights) {
      throw new BadRequestException(
        `Minimum stay is ${rateRule.minNights} nights`,
      );
    }

    // Build per-night breakdown applying seasonal rates
    const nightlyBreakdown: { date: string; rate: number }[] = [];
    let subtotal = 0;

    for (let i = 0; i < nights; i++) {
      const nightDate = new Date(checkIn);
      nightDate.setDate(nightDate.getDate() + i);

      const seasonal = listing.seasonalRates.find(
        (sr: { startsAt: Date; endsAt: Date; nightlyRate: number }) =>
          new Date(sr.startsAt) <= nightDate &&
          nightDate < new Date(sr.endsAt),
      );

      const rate = seasonal ? seasonal.nightlyRate : rateRule.baseNightlyRate;
      nightlyBreakdown.push({
        date: nightDate.toISOString().split('T')[0],
        rate,
      });
      subtotal += rate;
    }

    const cleaningFee = rateRule.cleaningFee;
    const grossPlatformFee = Math.round((subtotal + cleaningFee) * PLATFORM_FEE_RATE);

    // ── Loyalty discount (Phase 2 §5.13) ──────────────────────────────────────
    // The discount is applied to the platform fee only — host payouts are unaffected.
    let loyaltyDiscount = 0;
    let loyaltyTier: string | undefined;
    if (dto.userId) {
      const membership = await this.membershipService.getMembership(dto.userId);
      const rate = TIER_DISCOUNT_RATE[membership.tier];
      if (rate > 0) {
        loyaltyDiscount = Math.round(grossPlatformFee * rate);
      }
      loyaltyTier = membership.tier;
    }
    const platformFee = grossPlatformFee - loyaltyDiscount;

    // ── Add-ons (Phase 2 §5.7) — priced, validated and frozen at quote time ──
    const addOnLines = await this.addOnService.buildSnapshotLines(
      dto.listingId,
      checkIn,
      dto.addOns ?? [],
    );
    const addOnsTotal = addOnLines.reduce((s, l) => s + l.totalPrice, 0);
    const addOnCommissionTotal = addOnLines.reduce((s, l) => s + l.commission, 0);

    // ── GST (18% on platform's services revenue) ────────────────────────────
    // Tax base = platformFee + add-on commission (the platform's electronic-commerce
    // service revenue). Host's accommodation portion is their own tax responsibility.
    const gstBase = platformFee + addOnCommissionTotal;
    const gstAmount = Math.round(gstBase * GST_RATE);

    const total = subtotal + cleaningFee + platformFee + addOnsTotal + gstAmount;
    const depositAmount = Math.round(total * 0.5);
    const balanceAmount = total - depositAmount;

    // Pay Later first-instalment amounts per term. `splitAmount` gives the
    // earliest instalment — that's what the guest pays now to activate the
    // plan. Subsequent amounts are recomputed at plan-creation time from the
    // same rule, but we freeze the first one in the snapshot so the capture
    // reconciles against the quoted value.
    const splitFirst = (months: number): number => {
      if (total <= 0) return 0;
      const base = Math.floor(total / months);
      const remainder = total - base * months;
      return base + (remainder > 0 ? 1 : 0);
    };
    const payLaterFirstInstalment = [
      { months: 3, amountMinor: splitFirst(3) },
      { months: 6, amountMinor: splitFirst(6) },
      { months: 12, amountMinor: splitFirst(12) },
    ];

    const snapshotAt = new Date();
    const snapshot: PriceSnapshot = {
      listingId: dto.listingId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      nights,
      guests: dto.guests,
      baseNightlyRate: rateRule.baseNightlyRate,
      nightlyBreakdown,
      subtotal,
      cleaningFee,
      platformFeeRate: PLATFORM_FEE_RATE,
      platformFee,
      loyaltyDiscount,
      loyaltyTier,
      addOnsTotal,
      addOns: addOnLines.map((l) => ({
        addOnId: l.addOnId,
        providerId: l.providerId,
        title: l.title,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.totalPrice,
        commission: l.commission,
        providerShare: l.providerShare,
        cancellationTier: l.cancellationTier,
      })),
      gstRate: GST_RATE,
      gstAmount,
      total,
      depositAmount,
      balanceAmount,
      payLaterFirstInstalment,
      currency: 'INR',
      snapshotAt: snapshotAt.toISOString(),
      expiresAt: new Date(snapshotAt.getTime() + SNAPSHOT_TTL_MS).toISOString(),
    };

    // Attach HMAC so payment service can verify the snapshot hasn't been tampered with
    snapshot.hmac = this.snapshotSigner.sign(
      snapshot as unknown as Record<string, unknown>,
    );

    return snapshot;
  }

  /**
   * Live cancellation policy. THE source of truth for new bookings.
   *
   * Tiers must be sorted DESCENDING by `minHoursBefore`. The first row whose
   * `minHoursBefore` is ≤ `hoursUntilCheckIn` wins. Default below mirrors the
   * legacy code path:
   *   - ≥48h before check-in  → 100%
   *   - 11h–48h before        → 50% (the legacy threshold was "> 10")
   *   - ≤10h                  → 0%
   *
   * Step 7c of the correctness pass: callers must SNAPSHOT this onto the
   * Booking row at confirm time (Booking.cancellationPolicySnapshot) and
   * read from there at cancel time — never from the live constant — so in-
   * flight bookings keep their original terms even if this policy changes.
   */
  // 10.0001 (not 10) preserves the legacy boundary EXACTLY: the old code did
  // `hoursUntilCheckIn > 10` for the 50% tier, so x=10.0 mapped to 0%.
  // Changing the threshold to a round number would be an "adjacent" code
  // improvement that the production-correctness pass explicitly forbids.
  static readonly LIVE_CANCELLATION_TIERS: ReadonlyArray<{
    minHoursBefore: number;
    refundPct: number;
  }> = [
    { minHoursBefore: 48, refundPct: 100 },
    { minHoursBefore: 10.0001, refundPct: 50 },
    { minHoursBefore: 0, refundPct: 0 },
  ];

  /**
   * Build a fresh snapshot of the live tiers for persisting onto Booking.
   * Callers (e.g. confirmPayment) write this to `cancellationPolicySnapshot`.
   */
  static buildPolicySnapshot(): {
    tiers: { minHoursBefore: number; refundPct: number }[];
    snapshotAt: string;
  } {
    return {
      tiers: PricingService.LIVE_CANCELLATION_TIERS.map((t) => ({ ...t })),
      snapshotAt: new Date().toISOString(),
    };
  }

  /**
   * Compute refund amount.
   *
   * If `policySnapshot` is provided (the booking's frozen tiers), use it.
   * Otherwise fall back to the live tiers — for legacy rows predating the
   * snapshot column. Once all in-flight bookings have been re-confirmed
   * post-deploy, the fallback can be removed.
   */
  computeRefundAmount(
    totalPaid: number,
    checkIn: Date,
    cancelledAt: Date = new Date(),
    policySnapshot?: {
      tiers?: { minHoursBefore: number; refundPct: number }[];
    } | null,
  ): number {
    const hoursUntilCheckIn =
      (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

    const tiers =
      policySnapshot?.tiers && policySnapshot.tiers.length > 0
        ? [...policySnapshot.tiers].sort(
            (a, b) => b.minHoursBefore - a.minHoursBefore,
          )
        : PricingService.LIVE_CANCELLATION_TIERS;

    for (const tier of tiers) {
      if (hoursUntilCheckIn >= tier.minHoursBefore) {
        return Math.round((totalPaid * tier.refundPct) / 100);
      }
    }
    return 0;
  }

  private diffDays(from: Date, to: Date): number {
    return Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
