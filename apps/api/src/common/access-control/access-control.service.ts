import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class AccessControlService {
  hasAnyRole(
    userRole: UserRole | undefined,
    requiredRoles: UserRole[],
  ): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    if (!userRole) {
      return false;
    }
    return requiredRoles.includes(userRole);
  }
}
