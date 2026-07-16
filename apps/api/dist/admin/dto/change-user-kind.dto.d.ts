import { AdminLevel, ServiceType, UserKind } from '@prisma/client';
export declare class ChangeUserKindDto {
    kind: UserKind;
    reason: string;
    level?: AdminLevel;
    serviceType?: ServiceType;
    clusterId?: string;
    propertyId?: string;
}
