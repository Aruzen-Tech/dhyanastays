import { UserRole } from '@prisma/client';
export declare class AccessControlService {
    hasAnyRole(userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean;
}
