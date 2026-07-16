import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AddOn,
  AddOnScope,
  AddOnStatus,
  CancellationTier,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AddOnSelectionDto } from './dto/add-on-selection.dto';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { ReviewAddOnDto } from './dto/review-add-on.dto';

/**
 * Snapshot line for a single add-on selection — lives inside PriceSnapshot.addOns[].
 * All amounts in paise. Values are frozen at quote time and carried through to
 * BookingAddOn so pricing never changes under the guest's feet.
 */
export interface AddOnSnapshotLine {
  addOnId: string;
  providerId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  commission: number;
  providerShare: number;
  cancellationTier: CancellationTier;
}

@Injectable()
export class AddOnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Provider management (admin) ───────────────────────────────────────────

  async createServiceProvider(actorId: string, dto: CreateServiceProviderDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerUserId },
      select: { id: true, email: true },
    });
    if (!owner) throw new BadRequestException('Owner user not found');

    const provider = await this.prisma.serviceProvider.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        ownerUserId: dto.ownerUserId,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
      },
    });

    await this.audit.log(
      actorId,
      'SERVICE_PROVIDER_CREATED',
      'ServiceProvider',
      provider.id,
      { name: provider.name, kind: provider.kind },
    );

    return provider;
  }

  async listServiceProviders(activeOnly = false) {
    return this.prisma.serviceProvider.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: { select: { addOns: true } },
      },
    });
  }

  async setServiceProviderActive(actorId: string, id: string, active: boolean) {
    const provider = await this.prisma.serviceProvider.update({
      where: { id },
      data: { active },
    });
    await this.audit.log(
      actorId,
      active ? 'SERVICE_PROVIDER_ACTIVATED' : 'SERVICE_PROVIDER_DEACTIVATED',
      'ServiceProvider',
      id,
      { name: provider.name },
    );
    return provider;
  }

  // ── Add-on lifecycle ──────────────────────────────────────────────────────

  async createAddOn(actorId: string, dto: CreateAddOnDto) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider || !provider.active) {
      throw new BadRequestException('Provider not found or inactive');
    }

    if (dto.scope === 'LISTING' && !dto.listingId) {
      throw new BadRequestException('listingId required when scope=LISTING');
    }

    const addOn = await this.prisma.addOn.create({
      data: {
        providerId: dto.providerId,
        title: dto.title,
        description: dto.description,
        priceMinor: dto.priceMinor,
        commissionRate: dto.commissionRate ?? 0.15,
        cancellationTier: dto.cancellationTier ?? 'MODERATE',
        minLeadHours: dto.minLeadHours ?? 24,
        maxPerBooking: dto.maxPerBooking ?? 1,
        scope: dto.scope ?? 'GLOBAL',
        clusterId: dto.clusterId,
        listingId: dto.listingId,
        status: 'PENDING',
      },
    });

    await this.audit.log(actorId, 'ADDON_CREATED', 'AddOn', addOn.id, {
      title: addOn.title,
      price: addOn.priceMinor,
    });

    return addOn;
  }

  async listAddOns(filter?: { status?: AddOnStatus; providerId?: string }) {
    return this.prisma.addOn.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.providerId ? { providerId: filter.providerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: { select: { id: true, name: true, kind: true } },
        listing: { select: { id: true, title: true } },
      },
    });
  }

  /** Add-ons visible to guests for a given listing (APPROVED + scope matches). */
  async listPublicAddOnsForListing(listingId: string) {
    return this.prisma.addOn.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { scope: AddOnScope.GLOBAL },
          { scope: AddOnScope.LISTING, listingId },
        ],
      },
      orderBy: [{ priceMinor: 'asc' }, { title: 'asc' }],
      include: {
        provider: { select: { id: true, name: true, kind: true } },
      },
    });
  }

  async approveAddOn(actorId: string, id: string, dto: ReviewAddOnDto) {
    const addOn = await this.prisma.addOn.findUnique({ where: { id } });
    if (!addOn) throw new NotFoundException('Add-on not found');
    if (addOn.status !== 'PENDING') {
      throw new BadRequestException(`Add-on is already ${addOn.status}`);
    }

    const updated = await this.prisma.addOn.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: actorId,
        reviewNotes: dto.reviewNotes,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log(actorId, 'ADDON_APPROVED', 'AddOn', id, {
      title: updated.title,
    });

    return updated;
  }

  async rejectAddOn(actorId: string, id: string, dto: ReviewAddOnDto) {
    const addOn = await this.prisma.addOn.findUnique({ where: { id } });
    if (!addOn) throw new NotFoundException('Add-on not found');
    if (addOn.status !== 'PENDING') {
      throw new BadRequestException(`Add-on is already ${addOn.status}`);
    }

    const updated = await this.prisma.addOn.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: actorId,
        reviewNotes: dto.reviewNotes,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log(actorId, 'ADDON_REJECTED', 'AddOn', id, {
      title: updated.title,
      notes: dto.reviewNotes,
    });

    return updated;
  }

  async retireAddOn(actorId: string, id: string) {
    const updated = await this.prisma.addOn.update({
      where: { id },
      data: { status: 'RETIRED' },
    });
    await this.audit.log(actorId, 'ADDON_RETIRED', 'AddOn', id, {
      title: updated.title,
    });
    return updated;
  }

  // ── Quote-time snapshot building ──────────────────────────────────────────

  /**
   * Resolve guest-supplied selections into priced, HMAC-ready snapshot lines.
   * Applies the same validations used during hold creation (lead time, scope,
   * maxPerBooking, status). Returns empty array if selections is empty.
   */
  async buildSnapshotLines(
    listingId: string,
    checkIn: Date,
    selections: AddOnSelectionDto[],
  ): Promise<AddOnSnapshotLine[]> {
    if (!selections || selections.length === 0) return [];

    // Dedupe by id (quantities must be unique server-side — client may have duplicated)
    const byId = new Map<string, AddOnSelectionDto>();
    for (const s of selections) {
      const existing = byId.get(s.addOnId);
      byId.set(s.addOnId, {
        addOnId: s.addOnId,
        quantity: (existing?.quantity ?? 0) + s.quantity,
      });
    }

    const ids = Array.from(byId.keys());
    const addOns = await this.prisma.addOn.findMany({
      where: { id: { in: ids } },
      include: { provider: { select: { id: true, active: true } } },
    });

    if (addOns.length !== ids.length) {
      throw new BadRequestException('One or more add-ons not found');
    }

    const now = Date.now();
    const minLeadMs = (hours: number) => hours * 60 * 60 * 1000;

    const lines: AddOnSnapshotLine[] = [];
    for (const addOn of addOns) {
      const sel = byId.get(addOn.id)!;

      if (addOn.status !== 'APPROVED') {
        throw new BadRequestException(
          `Add-on "${addOn.title}" is not available (${addOn.status})`,
        );
      }
      if (!addOn.provider.active) {
        throw new BadRequestException(
          `Add-on "${addOn.title}" provider is inactive`,
        );
      }
      if (
        addOn.scope === AddOnScope.LISTING &&
        addOn.listingId !== listingId
      ) {
        throw new BadRequestException(
          `Add-on "${addOn.title}" is not available for this listing`,
        );
      }
      if (sel.quantity > addOn.maxPerBooking) {
        throw new BadRequestException(
          `Add-on "${addOn.title}" is limited to ${addOn.maxPerBooking} per booking`,
        );
      }
      if (checkIn.getTime() - now < minLeadMs(addOn.minLeadHours)) {
        throw new BadRequestException(
          `Add-on "${addOn.title}" requires at least ${addOn.minLeadHours}h lead time`,
        );
      }

      const totalPrice = addOn.priceMinor * sel.quantity;
      const commission = Math.round(totalPrice * addOn.commissionRate);
      const providerShare = totalPrice - commission;

      lines.push({
        addOnId: addOn.id,
        providerId: addOn.providerId,
        title: addOn.title,
        quantity: sel.quantity,
        unitPrice: addOn.priceMinor,
        totalPrice,
        commission,
        providerShare,
        cancellationTier: addOn.cancellationTier,
      });
    }

    return lines;
  }

  // ── Booking lifecycle hooks ──────────────────────────────────────────────

  /**
   * Materialize BookingAddOn rows from price snapshot at booking-confirm time.
   * Called from BookingService inside the same transaction.
   */
  async createBookingAddOns(
    tx: Prisma.TransactionClient,
    bookingId: string,
    snapshotLines: AddOnSnapshotLine[],
    snapshotHmac: string,
  ) {
    if (snapshotLines.length === 0) return [];

    const rows = await Promise.all(
      snapshotLines.map((line) =>
        tx.bookingAddOn.create({
          data: {
            bookingId,
            addOnId: line.addOnId,
            providerId: line.providerId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice,
            commission: line.commission,
            providerShare: line.providerShare,
            state: 'CONFIRMED',
            snapshotHmac,
          },
        }),
      ),
    );

    return rows;
  }

  /**
   * Compute refund when a booking is cancelled.
   * Applies cancellation-tier rules per add-on, returns total add-on refund in paise.
   * Also updates BookingAddOn state + refundAmount.
   */
  async cancelBookingAddOns(
    tx: Prisma.TransactionClient,
    bookingId: string,
    checkIn: Date,
    cancelledAt: Date = new Date(),
  ): Promise<number> {
    const bookingAddOns = await tx.bookingAddOn.findMany({
      where: { bookingId, state: { notIn: ['CANCELLED', 'REFUNDED'] } },
      include: { addOn: { select: { cancellationTier: true } } },
    });

    let totalRefund = 0;
    const hoursUntil =
      (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

    for (const ba of bookingAddOns) {
      const refundRate = refundRateForTier(
        ba.addOn.cancellationTier,
        hoursUntil,
      );
      const refundAmount = Math.round(ba.totalPrice * refundRate);

      await tx.bookingAddOn.update({
        where: { id: ba.id },
        data: {
          state: refundAmount > 0 ? 'REFUNDED' : 'CANCELLED',
          cancelledAt,
          refundedAt: refundAmount > 0 ? cancelledAt : null,
          refundAmount,
        },
      });

      totalRefund += refundAmount;
    }

    return totalRefund;
  }

  async getBookingAddOns(bookingId: string) {
    return this.prisma.bookingAddOn.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: {
        addOn: {
          select: {
            title: true,
            description: true,
            cancellationTier: true,
            provider: { select: { name: true, kind: true } },
          },
        },
      },
    });
  }
}

/**
 * Cancellation tier rules — returns fractional refund (0..1).
 * Mirrors booking-level policy shape but per-tier for service providers.
 */
function refundRateForTier(
  tier: CancellationTier,
  hoursUntilCheckIn: number,
): number {
  switch (tier) {
    case 'FLEXIBLE':
      return hoursUntilCheckIn >= 24 ? 1 : 0;
    case 'MODERATE':
      if (hoursUntilCheckIn >= 72) return 1;
      if (hoursUntilCheckIn >= 24) return 0.5;
      return 0;
    case 'STRICT':
      return hoursUntilCheckIn >= 168 ? 0.5 : 0; // 7 days
    case 'NON_REFUNDABLE':
      return 0;
  }
}

// Re-export for booking service to reuse refund tier logic if needed
export { refundRateForTier };
