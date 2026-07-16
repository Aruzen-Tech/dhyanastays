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
exports.HostSettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const feature_flag_service_1 = require("../feature/feature-flag.service");
const feature_flags_registry_1 = require("../feature/feature-flags.registry");
let HostSettingsService = class HostSettingsService {
    constructor(prisma, featureFlags) {
        this.prisma = prisma;
        this.featureFlags = featureFlags;
    }
    async hostIdFor(userId) {
        const host = await this.prisma.host.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!host)
            throw new common_1.ForbiddenException('Host profile not found');
        return host.id;
    }
    async getForHost(userId) {
        const hostId = await this.hostIdFor(userId);
        const settings = await this.prisma.hostSetting.upsert({
            where: { hostId },
            create: { hostId },
            update: {},
        });
        const enabled = await this.featureFlags.enabledMap();
        const features = feature_flags_registry_1.FEATURE_REGISTRY.filter((f) => f.audience.includes('host')).map((f) => ({
            key: f.key,
            label: f.label,
            description: f.description,
            category: f.category,
            enabled: enabled[f.key] ?? f.defaultEnabled,
        }));
        return { settings, features };
    }
    async update(userId, dto) {
        const hostId = await this.hostIdFor(userId);
        const settings = await this.prisma.hostSetting.upsert({
            where: { hostId },
            create: { hostId, ...sanitize(dto) },
            update: sanitize(dto),
        });
        return settings;
    }
    async settingByHostUserId(hostUserId) {
        const host = await this.prisma.host.findUnique({
            where: { userId: hostUserId },
            select: { id: true },
        });
        if (!host)
            return null;
        return this.prisma.hostSetting.findUnique({ where: { hostId: host.id } });
    }
    async allowsGuestMessages(hostUserId) {
        const s = await this.settingByHostUserId(hostUserId);
        return s ? s.allowGuestMessages : true;
    }
    async allowsConciergeChat(hostUserId) {
        const s = await this.settingByHostUserId(hostUserId);
        return s ? s.allowConciergeChat : true;
    }
};
exports.HostSettingsService = HostSettingsService;
exports.HostSettingsService = HostSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        feature_flag_service_1.FeatureFlagService])
], HostSettingsService);
function sanitize(dto) {
    const out = {};
    for (const k of [
        'instantBook',
        'allowGuestMessages',
        'allowConciergeChat',
        'emailOnNewBooking',
        'smsOnNewBooking',
    ]) {
        if (typeof dto[k] === 'boolean')
            out[k] = dto[k];
    }
    return out;
}
//# sourceMappingURL=host-settings.service.js.map