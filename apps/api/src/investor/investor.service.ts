import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CapitalCallStatus,
  DistributionStatus,
  InvestorDocumentKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { OutboxService } from '../notification/outbox.service';
import { UpsertInvestmentDto } from './dto/upsert-investment.dto';
import {
  CreateCapitalCallDto,
  UpdateCapitalCallDto,
} from './dto/upsert-capital-call.dto';
import { UploadInvestorDocumentDto } from './dto/upload-investor-document.dto';
import {
  RecomputeDistributionDto,
  UpdateDistributionDto,
} from './dto/recompute-distribution.dto';

/** Bookings whose revenue should count toward an investor distribution. */
const REVENUE_BOOKING_STATUSES: BookingStatus[] = [
  'CONFIRMED_DEPOSIT',
  'CONFIRMED_PAID',
  'BALANCE_DUE',
  'COMPLETED',
];

/** Fraction of (subtotal + cleaning) that flows to the owner/investor side
 *  after the 10% platform fee. */
const OWNER_NET_SHARE = 0.9;

type DistributionBreakdownEntry = {
  listingId: string;
  listingTitle: string;
  sharePct: number;
  grossMinor: number;
  sharedMinor: number;
};

@Injectable()
export class InvestorService {
  private readonly logger = new Logger(InvestorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  // ── Portfolio (investor self-service) ────────────────────────────────────

  async getPortfolio(investorUserId: string) {
    const investor = await this.prisma.user.findUnique({
      where: { id: investorUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        investorProfile: {
          select: { legalName: true, panMasked: true, kycStatus: true },
        },
      },
    });
    if (!investor) throw new NotFoundException('Investor not found');

    const investments = await this.prisma.investment.findMany({
      where: { investorUserId },
      orderBy: { effectiveAt: 'desc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            status: true,
          },
        },
      },
    });

    // Aggregate ROI across all investments.
    const listingIds = investments.map((i) => i.listingId);
    const bookings = listingIds.length
      ? await this.prisma.booking.findMany({
          where: {
            listingId: { in: listingIds },
            status: { in: REVENUE_BOOKING_STATUSES },
          },
          select: {
            listingId: true,
            startsAt: true,
            endsAt: true,
            priceSnapshot: true,
            status: true,
          },
        })
      : [];

    const perListing = investments.map((inv) => {
      const windowStart = inv.effectiveAt;
      const windowEnd = inv.endedAt;
      const share = Number(inv.sharePct);
      let grossMinor = 0;
      let bookingsCounted = 0;
      for (const b of bookings) {
        if (b.listingId !== inv.listingId) continue;
        if (b.startsAt < windowStart) continue;
        if (windowEnd && b.startsAt > windowEnd) continue;
        const snap = this.snapshotRevenue(b.priceSnapshot);
        grossMinor += snap;
        bookingsCounted += 1;
      }
      const netOwnerSideMinor = Math.round(grossMinor * OWNER_NET_SHARE);
      const investorShareMinor = Math.round(netOwnerSideMinor * share);
      return {
        investmentId: inv.id,
        listingId: inv.listingId,
        listing: inv.listing,
        sharePct: share,
        effectiveAt: inv.effectiveAt,
        endedAt: inv.endedAt,
        bookingsCounted,
        grossRevenueMinor: grossMinor,
        ownerSideNetMinor: netOwnerSideMinor,
        investorShareMinor,
      };
    });

    const totals = perListing.reduce(
      (acc, row) => {
        acc.grossRevenueMinor += row.grossRevenueMinor;
        acc.ownerSideNetMinor += row.ownerSideNetMinor;
        acc.investorShareMinor += row.investorShareMinor;
        acc.activeListings += row.endedAt ? 0 : 1;
        return acc;
      },
      {
        grossRevenueMinor: 0,
        ownerSideNetMinor: 0,
        investorShareMinor: 0,
        activeListings: 0,
      },
    );

    const distributed = await this.prisma.distribution.aggregate({
      where: { investorUserId, status: DistributionStatus.PAID },
      _sum: { amountMinor: true },
    });

    return {
      investor,
      totals: {
        ...totals,
        totalDistributedMinor: distributed._sum.amountMinor ?? 0,
      },
      investments: perListing,
    };
  }

  async listDistributions(
    investorUserId: string,
    opts: { from?: string; to?: string } = {},
  ) {
    const where: Prisma.DistributionWhereInput = { investorUserId };
    if (opts.from || opts.to) {
      where.period = {
        ...(opts.from ? { gte: opts.from } : {}),
        ...(opts.to ? { lte: opts.to } : {}),
      };
    }
    return this.prisma.distribution.findMany({
      where,
      orderBy: { period: 'desc' },
    });
  }

  async listCapitalCallsForInvestor(investorUserId: string) {
    const investmentListings = await this.prisma.investment.findMany({
      where: { investorUserId, endedAt: null },
      select: { listingId: true, sharePct: true },
    });
    if (investmentListings.length === 0) return [];

    const listingIds = investmentListings.map((i) => i.listingId);
    const calls = await this.prisma.capitalCall.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: { dueAt: 'asc' },
      include: {
        listing: { select: { id: true, title: true, city: true, state: true } },
      },
    });

    const shareByListing = new Map<string, number>();
    for (const inv of investmentListings) {
      shareByListing.set(inv.listingId, Number(inv.sharePct));
    }

    return calls.map((c) => {
      const share = shareByListing.get(c.listingId) ?? 0;
      return {
        ...c,
        investorSharePct: share,
        investorShareMinor: Math.round(c.amountMinor * share),
      };
    });
  }

  listDocuments(investorUserId: string) {
    return this.prisma.investorDocument.findMany({
      where: { investorUserId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  // ── Admin CRUD ───────────────────────────────────────────────────────────

  async createInvestment(dto: UpsertInvestmentDto, actorUserId: string) {
    await this.assertInvestorKind(dto.investorUserId);
    await this.assertListingExists(dto.listingId);

    if (dto.endedAt && new Date(dto.endedAt) <= new Date(dto.effectiveAt)) {
      throw new BadRequestException('endedAt must be after effectiveAt');
    }

    const created = await this.prisma.investment.create({
      data: {
        investorUserId: dto.investorUserId,
        listingId: dto.listingId,
        sharePct: new Prisma.Decimal(dto.sharePct),
        effectiveAt: new Date(dto.effectiveAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        notes: dto.notes ?? null,
      },
    });

    await this.audit.log(actorUserId, 'INVESTMENT_CREATED', 'Investment', created.id, {
      investorUserId: dto.investorUserId,
      listingId: dto.listingId,
      sharePct: dto.sharePct,
    });

    return created;
  }

  async updateInvestment(
    id: string,
    dto: Partial<UpsertInvestmentDto>,
    actorUserId: string,
  ) {
    const existing = await this.prisma.investment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Investment not found');

    const data: Prisma.InvestmentUpdateInput = {};
    if (dto.sharePct !== undefined) data.sharePct = new Prisma.Decimal(dto.sharePct);
    if (dto.effectiveAt) data.effectiveAt = new Date(dto.effectiveAt);
    if (dto.endedAt !== undefined) {
      data.endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.investment.update({ where: { id }, data });

    await this.audit.log(actorUserId, 'INVESTMENT_UPDATED', 'Investment', id, {
      changes: dto,
    });

    return updated;
  }

  async removeInvestment(id: string, actorUserId: string) {
    const existing = await this.prisma.investment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Investment not found');

    await this.prisma.investment.delete({ where: { id } });

    await this.audit.log(actorUserId, 'INVESTMENT_DELETED', 'Investment', id, {
      investorUserId: existing.investorUserId,
      listingId: existing.listingId,
    });
  }

  listInvestmentsAdmin(filters: { investorUserId?: string; listingId?: string }) {
    return this.prisma.investment.findMany({
      where: {
        ...(filters.investorUserId && { investorUserId: filters.investorUserId }),
        ...(filters.listingId && { listingId: filters.listingId }),
      },
      orderBy: { effectiveAt: 'desc' },
      include: {
        investor: { select: { id: true, fullName: true, email: true } },
        listing: { select: { id: true, title: true, city: true, state: true } },
      },
    });
  }

  // Capital calls -----------------------------------------------------------

  async createCapitalCall(dto: CreateCapitalCallDto, actorUserId: string) {
    await this.assertListingExists(dto.listingId);
    const created = await this.prisma.capitalCall.create({
      data: {
        listingId: dto.listingId,
        amountMinor: dto.amountMinor,
        reason: dto.reason,
        dueAt: new Date(dto.dueAt),
        notes: dto.notes ?? null,
      },
    });

    await this.audit.log(actorUserId, 'CAPITAL_CALL_CREATED', 'CapitalCall', created.id, {
      listingId: dto.listingId,
      amountMinor: dto.amountMinor,
    });

    await this.notifyInvestorsOfCapitalCall(created.id).catch((err) =>
      this.logger.error(`Capital call notify failed: ${String(err)}`),
    );

    return created;
  }

  async updateCapitalCall(
    id: string,
    dto: UpdateCapitalCallDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.capitalCall.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Capital call not found');

    const data: Prisma.CapitalCallUpdateInput = {};
    if (dto.amountMinor !== undefined) data.amountMinor = dto.amountMinor;
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.dueAt) data.dueAt = new Date(dto.dueAt);
    if (dto.status) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.capitalCall.update({
      where: { id },
      data,
    });

    await this.audit.log(actorUserId, 'CAPITAL_CALL_UPDATED', 'CapitalCall', id, {
      changes: dto,
    });

    return updated;
  }

  listCapitalCallsAdmin(filters: {
    listingId?: string;
    status?: CapitalCallStatus;
  }) {
    return this.prisma.capitalCall.findMany({
      where: {
        ...(filters.listingId && { listingId: filters.listingId }),
        ...(filters.status && { status: filters.status }),
      },
      orderBy: { dueAt: 'asc' },
      include: {
        listing: { select: { id: true, title: true, city: true, state: true } },
      },
    });
  }

  // Investor documents ------------------------------------------------------

  async uploadDocument(dto: UploadInvestorDocumentDto, actorUserId: string) {
    await this.assertInvestorKind(dto.investorUserId);
    const created = await this.prisma.investorDocument.create({
      data: {
        investorUserId: dto.investorUserId,
        kind: dto.kind,
        title: dto.title,
        url: dto.url,
        uploadedById: actorUserId,
      },
    });

    await this.audit.log(
      actorUserId,
      'INVESTOR_DOC_UPLOADED',
      'InvestorDocument',
      created.id,
      { investorUserId: dto.investorUserId, kind: dto.kind },
    );

    await this.outbox
      .enqueue({
        userId: dto.investorUserId,
        kind: 'investor.document.uploaded',
        channels: ['EMAIL'],
        payload: {
          subject: `New document available: ${dto.title}`,
          html: `<p>A new ${dto.kind.toLowerCase().replace('_', ' ')} document "<strong>${escapeHtml(
            dto.title,
          )}</strong>" has been uploaded to your investor document vault.</p>`,
          text: `A new document "${dto.title}" has been uploaded to your investor vault.`,
        },
      })
      .catch((err) =>
        this.logger.error(`Investor doc outbox enqueue failed: ${String(err)}`),
      );

    return created;
  }

  async removeDocument(id: string, actorUserId: string) {
    const existing = await this.prisma.investorDocument.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document not found');

    await this.prisma.investorDocument.delete({ where: { id } });
    await this.audit.log(
      actorUserId,
      'INVESTOR_DOC_DELETED',
      'InvestorDocument',
      id,
      { investorUserId: existing.investorUserId },
    );
  }

  listDocumentsAdmin(investorUserId?: string) {
    return this.prisma.investorDocument.findMany({
      where: { ...(investorUserId && { investorUserId }) },
      orderBy: { uploadedAt: 'desc' },
      include: {
        investor: { select: { id: true, fullName: true, email: true } },
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  // Distributions -----------------------------------------------------------

  async recomputeDistributions(
    dto: RecomputeDistributionDto,
    actorUserId: string,
  ) {
    const period = dto.period ?? previousMonthPeriod();
    const { periodStart, periodEnd } = periodBounds(period);

    const investors = dto.investorUserId
      ? await this.prisma.user.findMany({
          where: { id: dto.investorUserId, kind: 'INVESTOR' },
          select: { id: true },
        })
      : await this.prisma.user.findMany({
          where: {
            kind: 'INVESTOR',
            investments: { some: {} },
          },
          select: { id: true },
        });

    const results: Array<{ investorUserId: string; amountMinor: number }> = [];

    for (const investor of investors) {
      const amount = await this.computeAndUpsertDistribution(
        investor.id,
        period,
        periodStart,
        periodEnd,
      );
      results.push({ investorUserId: investor.id, amountMinor: amount });
    }

    await this.audit.log(
      actorUserId,
      'DISTRIBUTIONS_RECOMPUTED',
      'Distribution',
      period,
      { period, count: results.length },
    );

    return { period, computed: results.length, results };
  }

  /**
   * Internal — used by the monthly cron and admin recompute action.
   * Returns the computed amount in paise.
   */
  async computeAndUpsertDistribution(
    investorUserId: string,
    period: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const investments = await this.prisma.investment.findMany({
      where: {
        investorUserId,
        effectiveAt: { lte: periodEnd },
        OR: [{ endedAt: null }, { endedAt: { gte: periodStart } }],
      },
      include: {
        listing: { select: { title: true } },
      },
    });

    if (investments.length === 0) return 0;

    const listingIds = investments.map((i) => i.listingId);
    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: { in: listingIds },
        status: { in: REVENUE_BOOKING_STATUSES },
        startsAt: { gte: periodStart, lt: periodEnd },
      },
      select: { listingId: true, priceSnapshot: true },
    });

    const breakdown: DistributionBreakdownEntry[] = [];
    let totalMinor = 0;
    for (const inv of investments) {
      const share = Number(inv.sharePct);
      const gross = bookings
        .filter((b) => b.listingId === inv.listingId)
        .reduce((sum, b) => sum + this.snapshotRevenue(b.priceSnapshot), 0);
      const sharedMinor = Math.round(gross * OWNER_NET_SHARE * share);
      totalMinor += sharedMinor;
      breakdown.push({
        listingId: inv.listingId,
        listingTitle: inv.listing.title,
        sharePct: share,
        grossMinor: gross,
        sharedMinor,
      });
    }

    await this.prisma.distribution.upsert({
      where: {
        investorUserId_period: { investorUserId, period },
      },
      create: {
        investorUserId,
        period,
        amountMinor: totalMinor,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        status: DistributionStatus.CALCULATED,
      },
      update: {
        amountMinor: totalMinor,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        status: DistributionStatus.CALCULATED,
        computedAt: new Date(),
      },
    });

    return totalMinor;
  }

  listDistributionsAdmin(filters: { period?: string }) {
    return this.prisma.distribution.findMany({
      where: { ...(filters.period && { period: filters.period }) },
      orderBy: [{ period: 'desc' }, { computedAt: 'desc' }],
      include: {
        investor: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async updateDistribution(
    id: string,
    dto: UpdateDistributionDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.distribution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Distribution not found');

    const updated = await this.prisma.distribution.update({
      where: { id },
      data: {
        status: dto.status,
        ledgerEventId: dto.ledgerEventId ?? existing.ledgerEventId,
        paidAt: dto.status === DistributionStatus.PAID ? new Date() : existing.paidAt,
      },
    });

    await this.audit.log(
      actorUserId,
      'DISTRIBUTION_STATUS_UPDATED',
      'Distribution',
      id,
      { status: dto.status, ledgerEventId: dto.ledgerEventId },
    );

    if (dto.status === DistributionStatus.PAID) {
      await this.outbox
        .enqueue({
          userId: existing.investorUserId,
          kind: 'investor.distribution.paid',
          channels: ['EMAIL'],
          payload: {
            subject: `Distribution paid — ${existing.period}`,
            html: `<p>Your distribution for <strong>${existing.period}</strong> of ₹${(
              existing.amountMinor / 100
            ).toLocaleString('en-IN')} has been marked as paid.</p>`,
            text: `Distribution for ${existing.period} marked as paid.`,
          },
        })
        .catch((err) =>
          this.logger.error(`Distribution paid outbox failed: ${String(err)}`),
        );
    }

    return updated;
  }

  // ── Cron entry point ─────────────────────────────────────────────────────

  /**
   * Monthly close — computes distributions for the previous calendar month.
   * Idempotent: re-runs upsert the same (investorUserId, period) row.
   */
  async runMonthlyClose(now: Date = new Date()) {
    const period = previousMonthPeriod(now);
    const { periodStart, periodEnd } = periodBounds(period);
    const investors = await this.prisma.user.findMany({
      where: { kind: 'INVESTOR', investments: { some: {} } },
      select: { id: true },
    });

    let computed = 0;
    for (const investor of investors) {
      await this.computeAndUpsertDistribution(
        investor.id,
        period,
        periodStart,
        periodEnd,
      );
      computed += 1;
    }
    this.logger.log(
      `Monthly close period=${period} investors=${computed}`,
    );
    return { period, computed };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async assertInvestorKind(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, kind: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.kind !== 'INVESTOR') {
      throw new ForbiddenException('User is not an investor');
    }
  }

  private async assertListingExists(listingId: string) {
    const l = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!l) throw new NotFoundException('Listing not found');
  }

  private snapshotRevenue(snap: Prisma.JsonValue): number {
    if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return 0;
    const subtotal = Number((snap as Record<string, unknown>).subtotal ?? 0);
    const cleaningFee = Number((snap as Record<string, unknown>).cleaningFee ?? 0);
    return subtotal + cleaningFee;
  }

  private async notifyInvestorsOfCapitalCall(callId: string) {
    const call = await this.prisma.capitalCall.findUnique({
      where: { id: callId },
      include: { listing: { select: { id: true, title: true } } },
    });
    if (!call) return;

    const active = await this.prisma.investment.findMany({
      where: { listingId: call.listingId, endedAt: null },
      select: { investorUserId: true, sharePct: true },
    });

    const dueLabel = call.dueAt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    for (const inv of active) {
      const share = Number(inv.sharePct);
      const investorShareMinor = Math.round(call.amountMinor * share);
      await this.outbox.enqueue({
        userId: inv.investorUserId,
        kind: 'investor.capital_call.opened',
        channels: ['EMAIL'],
        payload: {
          subject: `Capital call — ${call.listing.title}`,
          html: `
            <p>A new capital call has been opened for <strong>${escapeHtml(call.listing.title)}</strong>.</p>
            <ul>
              <li>Total: ₹${(call.amountMinor / 100).toLocaleString('en-IN')}</li>
              <li>Your share (${(share * 100).toFixed(2)}%): ₹${(investorShareMinor / 100).toLocaleString('en-IN')}</li>
              <li>Due: ${dueLabel}</li>
            </ul>
            <p>Reason: ${escapeHtml(call.reason)}</p>
          `,
          text: `Capital call ₹${(investorShareMinor / 100).toLocaleString('en-IN')} for ${call.listing.title} due ${dueLabel}.`,
        },
      });
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function previousMonthPeriod(now: Date = new Date()): string {
  const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function periodBounds(period: string): { periodStart: Date; periodEnd: Date } {
  const [yStr, mStr] = period.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const periodStart = new Date(Date.UTC(y, m - 1, 1));
  const periodEnd = new Date(Date.UTC(y, m, 1));
  return { periodStart, periodEnd };
}
