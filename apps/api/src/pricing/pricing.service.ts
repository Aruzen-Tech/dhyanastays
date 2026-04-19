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

    const total = subtotal + cleaningFee + platformFee + addOnsTotal;
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
      total,
      depositAmount,
      balanceAmount,
      payLaterFirstInstalment,
      currency: 'INR',
      snapshotAt: new Date().toISOString(),
    };

    // Attach HMAC so payment service can verify the snapshot hasn't been tampered with
    snapshot.hmac = this.snapshotSigner.sign(
      snapshot as unknown as Record<string, unknown>,
    );

    return snapshot;
  }

  /**
   * Compute refund amount based on cancellation policy:
   * - ≥48h before checkIn  → 100% refund
   * - <48h but >10h        → 50% refund
   * - ≤10h before checkIn  → 0% refund
   */
  computeRefundAmount(
    totalPaid: number,
    checkIn: Date,
    cancelledAt: Date = new Date(),
  ): number {
    const hoursUntilCheckIn =
      (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

    if (hoursUntilCheckIn >= 48) {
      return totalPaid; // 100%
    } else if (hoursUntilCheckIn > 10) {
      return Math.round(totalPaid * 0.5); // 50%
    } else {
      return 0; // 0%
    }
  }

  private diffDays(from: Date, to: Date): number {
    return Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
