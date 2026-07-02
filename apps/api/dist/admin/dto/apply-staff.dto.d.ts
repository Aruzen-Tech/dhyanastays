import { AdminLevel, ServiceType } from '@prisma/client';
export declare class ApplyStaffDto {
    email: string;
    fullName: string;
    requestedLevel: AdminLevel;
    requestedService?: ServiceType;
    clusterId?: string;
    propertyId?: string;
    justification: string;
}
