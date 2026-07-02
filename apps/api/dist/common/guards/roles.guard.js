"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../decorators/roles.decorator");
const admin_level_decorator_1 = require("../decorators/admin-level.decorator");
const kinds_decorator_1 = require("../decorators/kinds.decorator");
const public_decorator_1 = require("../decorators/public.decorator");
const capabilities_service_1 = require("../services/capabilities.service");
function roleToCapability(role) {
    switch (role) {
        case client_1.UserRole.ADMIN:
            return capabilities_service_1.Capability.PLATFORM_ADMIN;
        case client_1.UserRole.HOST:
            return capabilities_service_1.Capability.HOST_MANAGE;
        case client_1.UserRole.GUEST:
            return capabilities_service_1.Capability.GUEST_BOOK;
    }
}
function levelToCapability(level) {
    switch (level) {
        case client_1.AdminLevel.L1: return capabilities_service_1.Capability.PLATFORM_ADMIN;
        case client_1.AdminLevel.L2: return capabilities_service_1.Capability.PLATFORM_OPS;
        case client_1.AdminLevel.L3: return capabilities_service_1.Capability.CLUSTER_ADMIN;
        case client_1.AdminLevel.L4: return capabilities_service_1.Capability.PROPERTY_ADMIN;
        case client_1.AdminLevel.L5: return capabilities_service_1.Capability.SERVICE_ADMIN;
    }
}
let RolesGuard = class RolesGuard {
    constructor(reflector, capabilities) {
        this.reflector = reflector;
        this.capabilities = capabilities;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [context.getHandler(), context.getClass()]);
        const requiredLevels = this.reflector.getAllAndOverride(admin_level_decorator_1.ADMIN_LEVEL_KEY, [context.getHandler(), context.getClass()]);
        const requiredKinds = this.reflector.getAllAndOverride(kinds_decorator_1.KINDS_KEY, [context.getHandler(), context.getClass()]);
        if ((!requiredRoles || requiredRoles.length === 0) &&
            (!requiredLevels || requiredLevels.length === 0) &&
            (!requiredKinds || requiredKinds.length === 0)) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const userRole = request.user?.role;
        const userKind = request.user?.kind;
        const adminLevel = request.user?.adminLevel;
        if (!userRole) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        const ctx = { role: userRole, kind: userKind, adminLevel };
        if (requiredLevels && requiredLevels.length > 0) {
            const required = requiredLevels.map(levelToCapability);
            if (!this.capabilities.hasAny(ctx, required)) {
                throw new common_1.ForbiddenException('Insufficient admin level');
            }
        }
        if (requiredRoles && requiredRoles.length > 0) {
            const required = requiredRoles.map(roleToCapability);
            if (!this.capabilities.hasAny(ctx, required)) {
                throw new common_1.ForbiddenException('Insufficient role for this action');
            }
        }
        if (requiredKinds && requiredKinds.length > 0) {
            const isAdmin = this.capabilities.has(ctx, capabilities_service_1.Capability.PLATFORM_ADMIN);
            if (!isAdmin && (!userKind || !requiredKinds.includes(userKind))) {
                throw new common_1.ForbiddenException('This endpoint is limited to specific user kinds');
            }
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        capabilities_service_1.CapabilitiesService])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map