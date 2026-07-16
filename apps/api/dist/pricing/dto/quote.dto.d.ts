import { AddOnSelectionDto } from '../../add-on/dto/add-on-selection.dto';
export declare class QuoteDto {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    addOns?: AddOnSelectionDto[];
    userId?: string;
}
export interface PriceSnapshotAddOn {
    addOnId: string;
    providerId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    commission: number;
    providerShare: number;
    cancellationTier: string;
}
export interface PriceSnapshot {
    listingId: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    baseNightlyRate: number;
    nightlyBreakdown: {
        date: string;
        rate: number;
    }[];
    subtotal: number;
    cleaningFee: number;
    platformFeeRate: number;
    platformFee: number;
    loyaltyDiscount?: number;
    loyaltyTier?: string;
    addOnsTotal: number;
    addOns: PriceSnapshotAddOn[];
    gstRate: number;
    gstAmount: number;
    total: number;
    depositAmount: number;
    balanceAmount: number;
    payLaterFirstInstalment?: {
        months: number;
        amountMinor: number;
    }[];
    currency: string;
    snapshotAt: string;
    expiresAt: string;
    hmac?: string;
}
