import { AddOnStatus, CancellationTier, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AddOnSelectionDto } from './dto/add-on-selection.dto';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { ReviewAddOnDto } from './dto/review-add-on.dto';
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
export declare class AddOnService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    createServiceProvider(actorId: string, dto: CreateServiceProviderDto): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: Prisma.JsonValue | null;
        active: boolean;
    }>;
    listServiceProviders(activeOnly?: boolean): Promise<({
        _count: {
            addOns: number;
        };
        owner: {
            id: string;
            email: string;
            fullName: string;
        };
    } & {
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: Prisma.JsonValue | null;
        active: boolean;
    })[]>;
    setServiceProviderActive(actorId: string, id: string, active: boolean): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: Prisma.JsonValue | null;
        active: boolean;
    }>;
    createAddOn(actorId: string, dto: CreateAddOnDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.AddOnStatus;
        title: string;
        listingId: string | null;
        currency: string;
        priceMinor: number;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        providerId: string;
        commissionRate: number;
        cancellationTier: import("@prisma/client").$Enums.CancellationTier;
        minLeadHours: number;
        maxPerBooking: number;
        availability: Prisma.JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    listAddOns(filter?: {
        status?: AddOnStatus;
        providerId?: string;
    }): Promise<({
        listing: {
            id: string;
            title: string;
        } | null;
        provider: {
            id: string;
            kind: import("@prisma/client").$Enums.ServiceType;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.AddOnStatus;
        title: string;
        listingId: string | null;
        currency: string;
        priceMinor: number;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        providerId: string;
        commissionRate: number;
        cancellationTier: import("@prisma/client").$Enums.CancellationTier;
        minLeadHours: number;
        maxPerBooking: number;
        availability: Prisma.JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    })[]>;
    listPublicAddOnsForListing(listingId: string): Promise<({
        provider: {
            id: string;
            kind: import("@prisma/client").$Enums.ServiceType;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.AddOnStatus;
        title: string;
        listingId: string | null;
        currency: string;
        priceMinor: number;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        providerId: string;
        commissionRate: number;
        cancellationTier: import("@prisma/client").$Enums.CancellationTier;
        minLeadHours: number;
        maxPerBooking: number;
        availability: Prisma.JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    })[]>;
    approveAddOn(actorId: string, id: string, dto: ReviewAddOnDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.AddOnStatus;
        title: string;
        listingId: string | null;
        currency: string;
        priceMinor: number;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        providerId: string;
        commissionRate: number;
        cancellationTier: import("@prisma/client").$Enums.CancellationTier;
        minLeadHours: number;
        maxPerBooking: number;
        availability: Prisma.JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    rejectAddOn(actorId: string, id: string, dto: ReviewAddOnDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.AddOnStatus;
        title: string;
        listingId: string | null;
        currency: string;
        priceMinor: number;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        providerId: string;
        commissionRate: number;
        cancellationTier: import("@prisma/client").$Enums.CancellationTier;
        minLeadHours: number;
        maxPerBooking: number;
        availability: Prisma.JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    retireAddOn(actorId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.AddOnStatus;
        title: string;
        listingId: string | null;
        currency: string;
        priceMinor: number;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        providerId: string;
        commissionRate: number;
        cancellationTier: import("@prisma/client").$Enums.CancellationTier;
        minLeadHours: number;
        maxPerBooking: number;
        availability: Prisma.JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    buildSnapshotLines(listingId: string, checkIn: Date, selections: AddOnSelectionDto[]): Promise<AddOnSnapshotLine[]>;
    createBookingAddOns(tx: Prisma.TransactionClient, bookingId: string, snapshotLines: AddOnSnapshotLine[], snapshotHmac: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        state: import("@prisma/client").$Enums.AddOnState;
        bookingId: string;
        cancelledAt: Date | null;
        refundedAt: Date | null;
        providerId: string;
        addOnId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        commission: number;
        providerShare: number;
        snapshotHmac: string;
        refundAmount: number | null;
    }[]>;
    cancelBookingAddOns(tx: Prisma.TransactionClient, bookingId: string, checkIn: Date, cancelledAt?: Date): Promise<number>;
    getBookingAddOns(bookingId: string): Promise<({
        addOn: {
            description: string;
            title: string;
            cancellationTier: import("@prisma/client").$Enums.CancellationTier;
            provider: {
                kind: import("@prisma/client").$Enums.ServiceType;
                name: string;
            };
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        state: import("@prisma/client").$Enums.AddOnState;
        bookingId: string;
        cancelledAt: Date | null;
        refundedAt: Date | null;
        providerId: string;
        addOnId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        commission: number;
        providerShare: number;
        snapshotHmac: string;
        refundAmount: number | null;
    })[]>;
}
declare function refundRateForTier(tier: CancellationTier, hoursUntilCheckIn: number): number;
export { refundRateForTier };
