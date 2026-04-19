import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { MembershipService } from './membership.service';
import { StartSipDto } from './dto/start-sip.dto';
import { ContributeSipDto } from './dto/contribute-sip.dto';

/** SIP contributions earn loyalty points at the same ₹100 = 1 point rate. */
const SIP_POINT_RATE_PAISE = 10000;

@Injectable()
export class SipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly membership: MembershipService,
  ) {}

  /**
   * Start a Trip Savings SIP. Each user has at most one ACTIVE SIP at a time —
   * pause or close the existing one to start another.
   */
  async startSip(userId: string, dto: StartSipDto) {
    const existingActive = await this.prisma.tripSip.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (existingActive) {
      throw new BadRequestException(
        'An active SIP already exists. Pause or close it before starting a new one.',
      );
    }

    if (dto.monthlyMinor < 50000) {
      throw new BadRequestException('Minimum monthly SIP is ₹500');
    }
    if (dto.anchorDay < 1 || dto.anchorDay > 28) {
      throw new BadRequestException('Anchor day must be between 1 and 28');
    }

    const sip = await this.prisma.tripSip.create({
      data: {
        userId,
        monthlyMinor: dto.monthlyMinor,
        anchorDay: dto.anchorDay,
        status: 'ACTIVE',
      },
    });

    await this.audit.log(userId, 'SIP_STARTED', 'TripSip', sip.id, {
      monthlyMinor: dto.monthlyMinor,
      anchorDay: dto.anchorDay,
    });

    return sip;
  }

  async listSips(userId: string) {
    return this.prisma.tripSip.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        _count: { select: { contributions: true } },
      },
    });
  }

  async getSip(userId: string, sipId: string) {
    const sip = await this.prisma.tripSip.findUnique({
      where: { id: sipId },
      include: {
        contributions: { orderBy: { depositedAt: 'desc' }, take: 50 },
      },
    });
    if (!sip || sip.userId !== userId) throw new NotFoundException('SIP not found');
    return sip;
  }

  async setStatus(userId: string, sipId: string, status: SipStatus) {
    const sip = await this.prisma.tripSip.findUnique({ where: { id: sipId } });
    if (!sip || sip.userId !== userId) throw new NotFoundException('SIP not found');
    if (sip.status === status) return sip;
    if (sip.status === 'CLOSED') {
      throw new BadRequestException('SIP is closed and cannot change status');
    }

    const updated = await this.prisma.tripSip.update({
      where: { id: sipId },
      data: {
        status,
        closedAt: status === 'CLOSED' ? new Date() : null,
      },
    });

    await this.audit.log(userId, `SIP_${status}`, 'TripSip', sipId, {
      previousStatus: sip.status,
    });

    return updated;
  }

  /**
   * Record a contribution. The contribution writes a CreditLedger row first
   * (the source of truth for the user's credit balance) and stores its id on
   * the SipContribution row as a 1:1 link. This is the exit criteria for
   * Phase 2: SIP deposits flow through the ledger.
   *
   * `paymentRef` is the razorpay payment id (or null for manual reconciliation).
   * Idempotency key is the payment ref — if a row with this paymentRef already
   * exists for this SIP, the existing record is returned.
   */
  async recordContribution(userId: string, sipId: string, dto: ContributeSipDto) {
    const sip = await this.prisma.tripSip.findUnique({ where: { id: sipId } });
    if (!sip || sip.userId !== userId) throw new NotFoundException('SIP not found');
    if (sip.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot contribute — SIP is ${sip.status}`);
    }
    if (dto.amountMinor <= 0) {
      throw new BadRequestException('amountMinor must be positive');
    }

    if (dto.paymentRef) {
      const existing = await this.prisma.sipContribution.findFirst({
        where: { sipId, paymentRef: dto.paymentRef },
      });
      if (existing) return existing;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.creditLedger.create({
        data: {
          userId,
          amount: dto.amountMinor,
          reason: 'sip_contribution',
          referenceId: sipId,
        },
      });

      const contribution = await tx.sipContribution.create({
        data: {
          sipId,
          amountMinor: dto.amountMinor,
          ledgerEventId: ledger.id,
          paymentRef: dto.paymentRef,
        },
      });

      // SIP contributions also accrue loyalty points (same rate as bookings).
      const points = Math.floor(dto.amountMinor / SIP_POINT_RATE_PAISE);
      if (points > 0) {
        await this.membership.awardPoints(userId, points, tx);
      }

      return { ledger, contribution };
    });

    await this.audit.log(userId, 'SIP_CONTRIBUTION', 'SipContribution', result.contribution.id, {
      sipId,
      amountMinor: dto.amountMinor,
      ledgerEventId: result.ledger.id,
      paymentRef: dto.paymentRef ?? null,
    });

    return result.contribution;
  }

  /**
   * Aggregate balance saved in this SIP (sum of contributions). Note: the user's
   * spendable credit balance is the sum of CreditLedger across all reasons; this
   * method returns the SIP-only saved total for the dashboard.
   */
  async getSipBalance(userId: string, sipId: string): Promise<number> {
    const sip = await this.prisma.tripSip.findUnique({ where: { id: sipId } });
    if (!sip || sip.userId !== userId) throw new NotFoundException('SIP not found');
    const agg = await this.prisma.sipContribution.aggregate({
      where: { sipId },
      _sum: { amountMinor: true },
    });
    return agg._sum.amountMinor ?? 0;
  }

  /**
   * Reconciliation hook: returns SIPs that are due for autodebit today.
   * Used by the autodebit cron — kept here so the cron can stay thin.
   */
  async listDueForAutodebit(today: Date) {
    return this.prisma.tripSip.findMany({
      where: { status: 'ACTIVE', anchorDay: today.getDate() },
    });
  }
}
