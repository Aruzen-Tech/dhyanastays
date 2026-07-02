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
var FeatureFlagService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/services/audit.service");
const feature_flags_registry_1 = require("./feature-flags.registry");
let FeatureFlagService = FeatureFlagService_1 = class FeatureFlagService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.logger = new common_1.Logger(FeatureFlagService_1.name);
        this.cache = null;
        this.cacheLoadedAt = 0;
    }
    async isEnabled(key) {
        const def = (0, feature_flags_registry_1.getFeatureDefinition)(key);
        if (!def) {
            this.logger.warn(`isEnabled called for unknown feature key "${key}"`);
            return true;
        }
        const overrides = await this.loadOverrides();
        return overrides.has(key) ? overrides.get(key) : def.defaultEnabled;
    }
    async listResolved() {
        const rows = await this.prisma.featureFlag.findMany();
        const byKey = new Map(rows.map((r) => [r.key, r]));
        return feature_flags_registry_1.FEATURE_REGISTRY.map((def) => {
            const row = byKey.get(def.key);
            return {
                ...def,
                enabled: row ? row.enabled : def.defaultEnabled,
                overridden: !!row,
                updatedAt: row ? row.updatedAt.toISOString() : null,
                updatedBy: row?.updatedBy ?? null,
            };
        });
    }
    async enabledMap() {
        const overrides = await this.loadOverrides();
        const out = {};
        for (const def of feature_flags_registry_1.FEATURE_REGISTRY) {
            out[def.key] = overrides.has(def.key)
                ? overrides.get(def.key)
                : def.defaultEnabled;
        }
        return out;
    }
    async setEnabled(actorId, key, enabled) {
        const def = (0, feature_flags_registry_1.getFeatureDefinition)(key);
        if (!def)
            throw new common_1.NotFoundException(`Unknown feature "${key}"`);
        await this.prisma.featureFlag.upsert({
            where: { key },
            create: { key, enabled, updatedBy: actorId },
            update: { enabled, updatedBy: actorId },
        });
        await this.auditService.log(actorId, 'FEATURE_FLAG_TOGGLED', 'feature', key, {
            enabled,
            label: def.label,
        });
        this.bustCache();
        const row = await this.prisma.featureFlag.findUnique({ where: { key } });
        return {
            ...def,
            enabled: row.enabled,
            overridden: true,
            updatedAt: row.updatedAt.toISOString(),
            updatedBy: row.updatedBy,
        };
    }
    async setMany(actorId, updates) {
        for (const u of updates) {
            const def = (0, feature_flags_registry_1.getFeatureDefinition)(u.key);
            if (!def)
                continue;
            await this.prisma.featureFlag.upsert({
                where: { key: u.key },
                create: { key: u.key, enabled: u.enabled, updatedBy: actorId },
                update: { enabled: u.enabled, updatedBy: actorId },
            });
        }
        await this.auditService.log(actorId, 'FEATURE_FLAGS_BULK_TOGGLED', 'feature', 'bulk', {
            count: updates.length,
        });
        this.bustCache();
        return this.listResolved();
    }
    async loadOverrides() {
        const now = Date.now();
        if (this.cache && now - this.cacheLoadedAt < FeatureFlagService_1.CACHE_TTL_MS) {
            return this.cache;
        }
        const rows = await this.prisma.featureFlag.findMany();
        this.cache = new Map(rows.map((r) => [r.key, r.enabled]));
        this.cacheLoadedAt = now;
        return this.cache;
    }
    bustCache() {
        this.cache = null;
        this.cacheLoadedAt = 0;
    }
};
exports.FeatureFlagService = FeatureFlagService;
FeatureFlagService.CACHE_TTL_MS = 15_000;
exports.FeatureFlagService = FeatureFlagService = FeatureFlagService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], FeatureFlagService);
//# sourceMappingURL=feature-flag.service.js.map