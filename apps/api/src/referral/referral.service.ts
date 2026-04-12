import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Referral credit amounts (paise)
const REFERRER_CREDIT_PAISE = 50000; // ₹500
const REFERRED_CREDIT_PAISE = 25000; // ₹250

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get or generate guest referral info ─────────────────────────────────

  async getReferralInfo(userId: string) {
    // Ensure user has a referral code
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (!user.referralCode) {
      // Generate a unique code
      let code: string;
      let attempts = 0;
      do {
        code = generateCode();
        const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      user = await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code! },
        select: { id: true, referralCode: true },
      });
    }

    // Get referral stats
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        referrerCredit: true,
        creditedAt: true,
        createdAt: true,
        referredUser: { select: { fullName: true } },
      },
    });

    const totalEarned = referrals.reduce((sum, r) => sum + r.referrerCredit, 0);
    const creditBalance = await this.getCreditBalance(userId);

    return {
      referralCode: user.referralCode,
      shareUrl: `/auth/register?ref=${user.referralCode}`,
      referrerReward: REFERRER_CREDIT_PAISE,
      referredReward: REFERRED_CREDIT_PAISE,
      totalReferrals: referrals.length,
      creditedReferrals: referrals.filter((r) => r.status === 'CREDITED').length,
      totalEarned,
      creditBalance,
      referrals: referrals.map((r) => ({
        id: r.id,
        guestName: r.referredUser?.fullName ?? 'Pending sign-up',
        status: r.status,
        credit: r.referrerCredit,
        creditedAt: r.creditedAt,
        createdAt: r.createdAt,
      })),
    };
  }

  // ─── Credit balance ───────────────────────────────────────────────────────

  async getCreditBalance(userId: string): Promise<number> {
    const result = await this.prisma.creditLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async getCreditLedger(userId: string) {
    const entries = await this.prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const balance = await this.getCreditBalance(userId);
    return { balance, entries };
  }

  // ─── Apply referral code at registration ─────────────────────────────────

  async applyReferralCode(newUserId: string, referralCode: string): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (!referrer) throw new BadRequestException('Invalid referral code');
    if (referrer.id === newUserId) throw new BadRequestException('Cannot refer yourself');

    // Check if this user already has a referral record
    const existing = await this.prisma.referral.findUnique({
      where: { referredUserId: newUserId },
    });
    if (existing) return; // already applied

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: newUserId,
        referralCode,
        status: 'SIGNED_UP',
      },
    });
  }

  // ─── Trigger credits on referred user's first completed booking ──────────

  async onReferredUserFirstBooking(userId: string): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { referredUserId: userId },
      select: { id: true, referrerId: true, status: true },
    });
    if (!referral || referral.status === 'CREDITED') return;

    // Count completed bookings
    const completedCount = await this.prisma.booking.count({
      where: { guestId: userId, status: 'COMPLETED' },
    });
    if (completedCount !== 1) return; // only on first completion

    // Issue credits to both parties
    await this.prisma.$transaction([
      this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'CREDITED',
          referrerCredit: REFERRER_CREDIT_PAISE,
          referredCredit: REFERRED_CREDIT_PAISE,
          creditedAt: new Date(),
        },
      }),
      this.prisma.creditLedger.create({
        data: {
          userId: referral.referrerId,
          amount: REFERRER_CREDIT_PAISE,
          reason: 'referral_bonus',
          referenceId: referral.id,
        },
      }),
      this.prisma.creditLedger.create({
        data: {
          userId,
          amount: REFERRED_CREDIT_PAISE,
          reason: 'referred_welcome_credit',
          referenceId: referral.id,
        },
      }),
    ]);
  }
}
