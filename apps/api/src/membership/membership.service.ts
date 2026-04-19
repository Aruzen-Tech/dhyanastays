import { Injectable } from '@nestjs/common';
import { MemberTier, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tier thresholds in points. A point = ₹100 of lifetime spend (subtotal+cleaning,
 * excluding platform fee and add-ons). Tier upgrade is monotonic — never demoted
 * by a refund, mirroring the airline-mile pattern guests already understand.
 */
export const TIER_THRESHOLDS: Record<MemberTier, number> = {
  EXPLORER: 0,
  WANDERER: 500,
  SOJOURNER: 1500,
  PATRON: 3500,
  AMBASSADOR: 7500,
};

const TIER_ORDER: MemberTier[] = [
  'EXPLORER',
  'WANDERER',
  'SOJOURNER',
  'PATRON',
  'AMBASSADOR',
];

/** Loyalty discount on platform fee, by tier. */
export const TIER_DISCOUNT_RATE: Record<MemberTier, number> = {
  EXPLORER: 0,
  WANDERER: 0.05,
  SOJOURNER: 0.10,
  PATRON: 0.15,
  AMBASSADOR: 0.20,
};

function tierForPoints(points: number): MemberTier {
  let result: MemberTier = 'EXPLORER';
  for (const tier of TIER_ORDER) {
    if (points >= TIER_THRESHOLDS[tier]) result = tier;
  }
  return result;
}

function nextThreshold(tier: MemberTier): number {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx < 0 || idx === TIER_ORDER.length - 1) {
    return TIER_THRESHOLDS[tier];
  }
  return TIER_THRESHOLDS[TIER_ORDER[idx + 1]];
}

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent — creates a default EXPLORER membership if none exists. */
  async ensureMembership(userId: string) {
    return this.prisma.membership.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        tier: 'EXPLORER',
        points: 0,
        nextTierAt: TIER_THRESHOLDS.WANDERER,
      },
    });
  }

  async getMembership(userId: string) {
    const m = await this.ensureMembership(userId);
    return {
      tier: m.tier,
      points: m.points,
      tierSince: m.tierSince,
      nextTierAt: m.nextTierAt,
      pointsToNextTier: Math.max(0, m.nextTierAt - m.points),
      discountRate: TIER_DISCOUNT_RATE[m.tier],
    };
  }

  /**
   * Award points and promote the tier if the new total crosses a threshold.
   * Safe to call inside a transaction (pass tx); otherwise opens its own.
   * Points are monotonic — a negative delta does not demote tier.
   */
  async awardPoints(
    userId: string,
    deltaPoints: number,
    tx?: Prisma.TransactionClient,
  ) {
    if (deltaPoints === 0) return;
    const client = tx ?? this.prisma;

    const current = await client.membership.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        tier: 'EXPLORER',
        points: 0,
        nextTierAt: TIER_THRESHOLDS.WANDERER,
      },
    });

    const newPoints = Math.max(0, current.points + deltaPoints);
    const computedTier = tierForPoints(newPoints);
    // Never demote: keep the higher of computed vs. current tier.
    const newTier =
      TIER_ORDER.indexOf(computedTier) > TIER_ORDER.indexOf(current.tier)
        ? computedTier
        : current.tier;

    await client.membership.update({
      where: { userId },
      data: {
        points: newPoints,
        tier: newTier,
        tierSince: newTier !== current.tier ? new Date() : current.tierSince,
        nextTierAt: nextThreshold(newTier),
      },
    });
  }

  /** Convert paise → points (₹100 = 1 point), rounded down. */
  pointsForPaise(paise: number): number {
    return Math.floor(paise / 10000);
  }

  async getPerksForUser(userId: string) {
    const m = await this.ensureMembership(userId);
    const eligibleTiers = TIER_ORDER.slice(0, TIER_ORDER.indexOf(m.tier) + 1);
    const perks = await this.prisma.perk.findMany({
      where: { active: true, tier: { in: eligibleTiers } },
      orderBy: [{ tier: 'asc' }, { createdAt: 'asc' }],
    });
    return { tier: m.tier, perks };
  }
}
