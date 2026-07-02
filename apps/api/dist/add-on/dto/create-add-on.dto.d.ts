import { AddOnScope, CancellationTier } from '@prisma/client';
export declare class CreateAddOnDto {
    providerId: string;
    title: string;
    description: string;
    priceMinor: number;
    commissionRate?: number;
    cancellationTier?: CancellationTier;
    minLeadHours?: number;
    maxPerBooking?: number;
    scope?: AddOnScope;
    clusterId?: string;
    listingId?: string;
}
