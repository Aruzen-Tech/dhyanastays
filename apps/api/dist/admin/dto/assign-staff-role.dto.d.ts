import { AdminLevel, ServiceType } from '@prisma/client';
export declare class AssignStaffRoleDto {
    level: AdminLevel;
    serviceType?: ServiceType;
    clusterId?: string;
    propertyId?: string;
}
