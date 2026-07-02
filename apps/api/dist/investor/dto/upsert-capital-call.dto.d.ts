import { CapitalCallStatus } from '@prisma/client';
export declare class CreateCapitalCallDto {
    listingId: string;
    amountMinor: number;
    reason: string;
    dueAt: string;
    notes?: string;
}
export declare class UpdateCapitalCallDto {
    amountMinor?: number;
    reason?: string;
    dueAt?: string;
    status?: CapitalCallStatus;
    notes?: string;
}
