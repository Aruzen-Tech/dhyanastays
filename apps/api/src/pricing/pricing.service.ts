import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriceSnapshotSignerService } from '../common/services/price-snapshot-signer.service';
import { PriceSnapshot, QuoteDto } from './dto/quote.dto';

export const PLATFORM_FEE_RATE = 0.10; // 10% platform commission

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotSigner: PriceSnapshotSignerService,
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
    const platformFee = Math.round((subtotal + cleaningFee) * PLATFORM_FEE_RATE);
    const total = subtotal + cleaningFee + platformFee;
    const depositAmount = Math.round(total * 0.5);
    const balanceAmount = total - depositAmount;

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
      total,
      depositAmount,
      balanceAmount,
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
