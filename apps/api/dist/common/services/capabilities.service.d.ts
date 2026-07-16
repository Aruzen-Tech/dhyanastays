import { AdminLevel, UserKind, UserRole } from '@prisma/client';
export declare const Capability: {
    readonly PLATFORM_ADMIN: "platform.admin";
    readonly PLATFORM_OPS: "platform.ops";
    readonly CLUSTER_ADMIN: "cluster.admin";
    readonly PROPERTY_ADMIN: "property.admin";
    readonly SERVICE_ADMIN: "service.admin";
    readonly HOST_MANAGE: "host.manage";
    readonly INVESTOR_VIEW: "investor.view";
    readonly GUEST_BOOK: "guest.book";
};
export type CapabilityKey = (typeof Capability)[keyof typeof Capability];
export interface UserCapabilityContext {
    role: UserRole;
    kind?: UserKind | null;
    adminLevel?: AdminLevel | null;
    clusterId?: string | null;
    propertyId?: string | null;
}
export declare class CapabilitiesService {
    derive(ctx: UserCapabilityContext): Set<CapabilityKey>;
    has(ctx: UserCapabilityContext, capability: CapabilityKey): boolean;
    hasAny(ctx: UserCapabilityContext, capabilities: CapabilityKey[]): boolean;
}
