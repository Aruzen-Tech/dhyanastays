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
        name: string;
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
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
        name: string;
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: Prisma.JsonValue | null;
        active: boolean;
    })[]>;
    setServiceProviderActive(actorId: string, id: string, active: boolean): Promise<{
        name: string;
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: Prisma.JsonValue | null;
        active: boolean;
    }>;
    createAddOn(actorId: string, dto: CreateAddOnDto): Promise<{
        scope: import("@prisma/client").$Enums.AddOnScope;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        status: import("@prisma/client").$Enums.AddOnStatus;
        listingId: string | null;
        title: string;
        description: string;
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
            name: string;
            id: string;
            kind: import("@prisma/client").$Enums.ServiceType;
        };
    } & {
        scope: import("@prisma/client").$Enums.AddOnScope;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        status: import("@prisma/client").$Enums.AddOnStatus;
        listingId: string | null;
        title: string;
        description: string;
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
    })[]>;
    listPublicAddOnsForListing(listingId: string): Promise<({
        provider: {
            name: string;
            id: string;
            kind: import("@prisma/client").$Enums.ServiceType;
        };
    } & {
        scope: import("@prisma/client").$Enums.AddOnScope;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        status: import("@prisma/client").$Enums.AddOnStatus;
        listingId: string | null;
        title: string;
        description: string;
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
    })[]>;
    approveAddOn(actorId: string, id: string, dto: ReviewAddOnDto): Promise<{
        scope: import("@prisma/client").$Enums.AddOnScope;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        status: import("@prisma/client").$Enums.AddOnStatus;
        listingId: string | null;
        title: string;
        description: string;
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
    }>;
    rejectAddOn(actorId: string, id: string, dto: ReviewAddOnDto): Promise<{
        scope: import("@prisma/client").$Enums.AddOnScope;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        status: import("@prisma/client").$Enums.AddOnStatus;
        listingId: string | null;
        title: string;
        description: string;
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
    }>;
    retireAddOn(actorId: string, id: string): Promise<{
        scope: import("@prisma/client").$Enums.AddOnScope;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        status: import("@prisma/client").$Enums.AddOnStatus;
        listingId: string | null;
        title: string;
        description: string;
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
            title: string;
            description: string;
            cancellationTier: import("@prisma/client").$Enums.CancellationTier;
            provider: {
                name: string;
                kind: import("@prisma/client").$Enums.ServiceType;
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
