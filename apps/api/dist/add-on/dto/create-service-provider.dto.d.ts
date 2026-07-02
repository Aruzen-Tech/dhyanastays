import { ServiceType } from '@prisma/client';
export declare class CreateServiceProviderDto {
    name: string;
    kind: ServiceType;
    ownerUserId: string;
    contactEmail?: string;
    contactPhone?: string;
}
