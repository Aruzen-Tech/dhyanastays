import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminLevel, UserKind, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ADMIN_LEVEL_KEY } from '../decorators/admin-level.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CapabilitiesService, CapabilityKey, Capability } from '../services/capabilities.service';

/** Maps the legacy @Roles(UserRole.X) decorator to the required capability */
function roleToCapability(role: UserRole): CapabilityKey {
  switch (role) {
    case UserRole.ADMIN:
      return Capability.PLATFORM_ADMIN;
    case UserRole.HOST:
      return Capability.HOST_MANAGE;
    case UserRole.GUEST:
      return Capability.GUEST_BOOK;
  }
}

/** Maps AdminLevel enum to the required capability */
function levelToCapability(level: AdminLevel): CapabilityKey {
  switch (level) {
    case AdminLevel.L1: return Capability.PLATFORM_ADMIN;
    case AdminLevel.L2: return Capability.PLATFORM_OPS;
    case AdminLevel.L3: return Capability.CLUSTER_ADMIN;
    case AdminLevel.L4: return Capability.PROPERTY_ADMIN;
    case AdminLevel.L5: return Capability.SERVICE_ADMIN;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly capabilities: CapabilitiesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // ── Skip guard for @Public() endpoints ─────────────────────────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // ── Read decorators ────────────────────────────────────────────────────
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredLevels = this.reflector.getAllAndOverride<AdminLevel[]>(
      ADMIN_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role/level requirements → allow
    if ((!requiredRoles || requiredRoles.length === 0) &&
        (!requiredLevels || requiredLevels.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role as UserRole | undefined;
    const userKind = request.user?.kind as UserKind | undefined;
    const adminLevel = request.user?.adminLevel as AdminLevel | undefined;

    if (!userRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const ctx = { role: userRole, kind: userKind, adminLevel };

    // ── Check @AdminLevel(L1, L2, …) ──────────────────────────────────────
    if (requiredLevels && requiredLevels.length > 0) {
      const required = requiredLevels.map(levelToCapability);
      if (!this.capabilities.hasAny(ctx, required)) {
        throw new ForbiddenException('Insufficient admin level');
      }
    }

    // ── Check @Roles(UserRole.ADMIN, …) ───────────────────────────────────
    if (requiredRoles && requiredRoles.length > 0) {
      const required = requiredRoles.map(roleToCapability);
      if (!this.capabilities.hasAny(ctx, required)) {
        throw new ForbiddenException('Insufficient role for this action');
      }
    }

    return true;
  }
}
