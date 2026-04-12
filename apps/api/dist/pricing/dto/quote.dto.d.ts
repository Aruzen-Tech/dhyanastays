export declare class QuoteDto {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
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
    total: number;
    depositAmount: number;
    balanceAmount: number;
    currency: string;
    snapshotAt: string;
}
