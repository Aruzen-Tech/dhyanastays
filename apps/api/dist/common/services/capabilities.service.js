"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilitiesService = exports.Capability = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
exports.Capability = {
    PLATFORM_ADMIN: 'platform.admin',
    PLATFORM_OPS: 'platform.ops',
    CLUSTER_ADMIN: 'cluster.admin',
    PROPERTY_ADMIN: 'property.admin',
    SERVICE_ADMIN: 'service.admin',
    HOST_MANAGE: 'host.manage',
    INVESTOR_VIEW: 'investor.view',
    GUEST_BOOK: 'guest.book',
};
let CapabilitiesService = class CapabilitiesService {
    derive(ctx) {
        const caps = new Set();
        if (ctx.role === client_1.UserRole.ADMIN) {
            caps.add(exports.Capability.PLATFORM_ADMIN);
            caps.add(exports.Capability.PLATFORM_OPS);
            caps.add(exports.Capability.CLUSTER_ADMIN);
            caps.add(exports.Capability.PROPERTY_ADMIN);
            caps.add(exports.Capability.SERVICE_ADMIN);
            caps.add(exports.Capability.HOST_MANAGE);
            caps.add(exports.Capability.GUEST_BOOK);
            return caps;
        }
        if (ctx.role === client_1.UserRole.HOST) {
            caps.add(exports.Capability.HOST_MANAGE);
            caps.add(exports.Capability.GUEST_BOOK);
            return caps;
        }
        if (ctx.role === client_1.UserRole.GUEST) {
            caps.add(exports.Capability.GUEST_BOOK);
        }
        if (ctx.kind === client_1.UserKind.STAFF && ctx.adminLevel) {
            switch (ctx.adminLevel) {
                case client_1.AdminLevel.L1:
                    caps.add(exports.Capability.PLATFORM_ADMIN);
                    caps.add(exports.Capability.PLATFORM_OPS);
                    caps.add(exports.Capability.CLUSTER_ADMIN);
                    caps.add(exports.Capability.PROPERTY_ADMIN);
                    caps.add(exports.Capability.SERVICE_ADMIN);
                    break;
                case client_1.AdminLevel.L2:
                    caps.add(exports.Capability.PLATFORM_OPS);
                    caps.add(exports.Capability.CLUSTER_ADMIN);
                    caps.add(exports.Capability.PROPERTY_ADMIN);
                    break;
                case client_1.AdminLevel.L3:
                    caps.add(exports.Capability.CLUSTER_ADMIN);
                    caps.add(exports.Capability.PROPERTY_ADMIN);
                    break;
                case client_1.AdminLevel.L4:
                    caps.add(exports.Capability.PROPERTY_ADMIN);
                    break;
                case client_1.AdminLevel.L5:
                    caps.add(exports.Capability.SERVICE_ADMIN);
                    break;
            }
        }
        if (ctx.kind === client_1.UserKind.OWNER) {
            caps.add(exports.Capability.HOST_MANAGE);
            caps.add(exports.Capability.GUEST_BOOK);
        }
        if (ctx.kind === client_1.UserKind.INVESTOR) {
            caps.add(exports.Capability.INVESTOR_VIEW);
        }
        if (ctx.kind === client_1.UserKind.GUEST) {
            caps.add(exports.Capability.GUEST_BOOK);
        }
        return caps;
    }
    has(ctx, capability) {
        return this.derive(ctx).has(capability);
    }
    hasAny(ctx, capabilities) {
        const userCaps = this.derive(ctx);
        return capabilities.some((c) => userCaps.has(c));
    }
};
exports.CapabilitiesService = CapabilitiesService;
exports.CapabilitiesService = CapabilitiesService = __decorate([
    (0, common_1.Injectable)()
], CapabilitiesService);
//# sourceMappingURL=capabilities.service.js.map