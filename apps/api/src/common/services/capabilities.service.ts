/**
 * CapabilitiesService — Phase 1 Role Model
 *
 * Derives a capability set from (UserRole, UserKind, StaffRole.level).
 * Guards use this instead of raw role strings, so we never hardcode
 * "role === 'ADMIN'" in business logic again.
 *
 * Current capability set (extensible without schema changes):
 *   platform.admin          – full platform access (L1)
 *   platform.ops            – operations access (L2)
 *   cluster.admin           – regional cluster admin (L3)
 *   property.admin          – single property admin (L4)
 *   service.admin           – service-team admin (L5)
 *   host.manage             – manage own listings, bookings, payouts
 *   investor.view           – view own portfolio
 *   guest.book              – create bookings
 *
 * Backward-compat bridge:
 *   UserRole.ADMIN  → STAFF + L1 capabilities
 *   UserRole.HOST   → host.manage capabilities
 *   UserRole.GUEST  → guest.book capabilities
 */
import { Injectable } from '@nestjs/common';
import { AdminLevel, UserKind, UserRole } from '@prisma/client';

export const Capability = {
  PLATFORM_ADMIN:  'platform.admin',
  PLATFORM_OPS:    'platform.ops',
  CLUSTER_ADMIN:   'cluster.admin',
  PROPERTY_ADMIN:  'property.admin',
  SERVICE_ADMIN:   'service.admin',
  HOST_MANAGE:     'host.manage',
  INVESTOR_VIEW:   'investor.view',
  GUEST_BOOK:      'guest.book',
} as const;
export type CapabilityKey = (typeof Capability)[keyof typeof Capability];

export interface UserCapabilityContext {
  role: UserRole;
  kind?: UserKind | null;
  adminLevel?: AdminLevel | null;
  clusterId?: string | null;
  propertyId?: string | null;
}

@Injectable()
export class CapabilitiesService {
  /**
   * Returns the full set of capabilities for a user.
   * Used at request time — keep it O(1), no DB calls.
   */
  derive(ctx: UserCapabilityContext): Set<CapabilityKey> {
    const caps = new Set<CapabilityKey>();

    // ── Legacy role bridge (backward compat) ───────────────────────────────
    if (ctx.role === UserRole.ADMIN) {
      caps.add(Capability.PLATFORM_ADMIN);
      caps.add(Capability.PLATFORM_OPS);
      caps.add(Capability.CLUSTER_ADMIN);
      caps.add(Capability.PROPERTY_ADMIN);
      caps.add(Capability.SERVICE_ADMIN);
      caps.add(Capability.HOST_MANAGE);
      caps.add(Capability.GUEST_BOOK);
      return caps;
    }

    if (ctx.role === UserRole.HOST) {
      caps.add(Capability.HOST_MANAGE);
      caps.add(Capability.GUEST_BOOK);
      return caps;
    }

    if (ctx.role === UserRole.GUEST) {
      caps.add(Capability.GUEST_BOOK);
    }

    // ── Phase 1: UserKind + StaffRole.level ────────────────────────────────
    if (ctx.kind === UserKind.STAFF && ctx.adminLevel) {
      switch (ctx.adminLevel) {
        case AdminLevel.L1:
          caps.add(Capability.PLATFORM_ADMIN);
          caps.add(Capability.PLATFORM_OPS);
          caps.add(Capability.CLUSTER_ADMIN);
          caps.add(Capability.PROPERTY_ADMIN);
          caps.add(Capability.SERVICE_ADMIN);
          break;
        case AdminLevel.L2:
          caps.add(Capability.PLATFORM_OPS);
          caps.add(Capability.CLUSTER_ADMIN);
          caps.add(Capability.PROPERTY_ADMIN);
          break;
        case AdminLevel.L3:
          caps.add(Capability.CLUSTER_ADMIN);
          caps.add(Capability.PROPERTY_ADMIN);
          break;
        case AdminLevel.L4:
          caps.add(Capability.PROPERTY_ADMIN);
          break;
        case AdminLevel.L5:
          caps.add(Capability.SERVICE_ADMIN);
          break;
      }
    }

    if (ctx.kind === UserKind.OWNER) {
      caps.add(Capability.HOST_MANAGE);
      caps.add(Capability.GUEST_BOOK);
    }

    if (ctx.kind === UserKind.INVESTOR) {
      caps.add(Capability.INVESTOR_VIEW);
    }

    if (ctx.kind === UserKind.GUEST) {
      caps.add(Capability.GUEST_BOOK);
    }

    return caps;
  }

  has(ctx: UserCapabilityContext, capability: CapabilityKey): boolean {
    return this.derive(ctx).has(capability);
  }

  hasAny(ctx: UserCapabilityContext, capabilities: CapabilityKey[]): boolean {
    const userCaps = this.derive(ctx);
    return capabilities.some((c) => userCaps.has(c));
  }
}
