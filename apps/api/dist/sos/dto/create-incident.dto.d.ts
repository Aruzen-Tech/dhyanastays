import { SosTier } from '@prisma/client';
export declare class CreateIncidentDto {
    tier: SosTier;
    lat: number;
    lng: number;
    message?: string;
    bookingId?: string;
}
