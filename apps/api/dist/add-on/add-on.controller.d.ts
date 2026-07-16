import { RequestUser } from '../common/decorators/current-user.decorator';
import { AddOnService } from './add-on.service';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { ReviewAddOnDto } from './dto/review-add-on.dto';
export declare class AddOnController {
    private readonly addOnService;
    constructor(addOnService: AddOnService);
    listForListing(listingId: string): Promise<({
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    listProviders(activeOnly?: string): Promise<({
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
        payoutMethod: import("@prisma/client/runtime/library").JsonValue | null;
        active: boolean;
    })[]>;
    createProvider(actor: RequestUser, dto: CreateServiceProviderDto): Promise<{
        name: string;
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: import("@prisma/client/runtime/library").JsonValue | null;
        active: boolean;
    }>;
    activateProvider(actor: RequestUser, id: string): Promise<{
        name: string;
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: import("@prisma/client/runtime/library").JsonValue | null;
        active: boolean;
    }>;
    deactivateProvider(actor: RequestUser, id: string): Promise<{
        name: string;
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: import("@prisma/client/runtime/library").JsonValue | null;
        active: boolean;
    }>;
    listAdmin(status?: string, providerId?: string): Promise<({
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    create(actor: RequestUser, dto: CreateAddOnDto): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    approve(actor: RequestUser, id: string, dto: ReviewAddOnDto): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    reject(actor: RequestUser, id: string, dto: ReviewAddOnDto): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    retire(actor: RequestUser, id: string): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    listForBooking(bookingId: string): Promise<({
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
