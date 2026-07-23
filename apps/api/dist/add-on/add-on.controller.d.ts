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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
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
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: import("@prisma/client/runtime/library").JsonValue | null;
        active: boolean;
    })[]>;
    createProvider(actor: RequestUser, dto: CreateServiceProviderDto): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: import("@prisma/client/runtime/library").JsonValue | null;
        active: boolean;
    }>;
    activateProvider(actor: RequestUser, id: string): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerUserId: string;
        contactEmail: string | null;
        contactPhone: string | null;
        payoutMethod: import("@prisma/client/runtime/library").JsonValue | null;
        active: boolean;
    }>;
    deactivateProvider(actor: RequestUser, id: string): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ServiceType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    })[]>;
    create(actor: RequestUser, dto: CreateAddOnDto): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    approve(actor: RequestUser, id: string, dto: ReviewAddOnDto): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    reject(actor: RequestUser, id: string, dto: ReviewAddOnDto): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    retire(actor: RequestUser, id: string): Promise<{
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
        availability: import("@prisma/client/runtime/library").JsonValue | null;
        scope: import("@prisma/client").$Enums.AddOnScope;
    }>;
    listForBooking(bookingId: string): Promise<({
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
