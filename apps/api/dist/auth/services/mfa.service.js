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
exports.MfaService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const otplib_1 = require("otplib");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_service_1 = require("../auth.service");
const TOTP_OPTIONS = { digits: 6, step: 30, window: 1 };
let MfaService = class MfaService {
    constructor(prisma, jwtService, authService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.authService = authService;
    }
    async setupTotp(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const existing = await this.prisma.mfaFactor.findUnique({
            where: { userId_type: { userId, type: 'TOTP' } },
        });
        if (existing?.confirmed) {
            throw new common_1.BadRequestException('TOTP is already enabled. Disable it first to re-enroll.');
        }
        const secret = (0, otplib_1.generateSecret)();
        const otpAuthUrl = (0, otplib_1.generateURI)({ label: user.email, secret, issuer: 'DhyanaStays' });
        await this.prisma.mfaFactor.upsert({
            where: { userId_type: { userId, type: 'TOTP' } },
            create: { userId, type: 'TOTP', secret, confirmed: false },
            update: { secret, confirmed: false },
        });
        return {
            secret,
            otpAuthUrl,
            manualEntryKey: secret,
        };
    }
    async confirmTotp(userId, code) {
        const factor = await this.prisma.mfaFactor.findUnique({
            where: { userId_type: { userId, type: 'TOTP' } },
        });
        if (!factor || factor.confirmed) {
            throw new common_1.BadRequestException('No pending TOTP setup found');
        }
        const result = await (0, otplib_1.verify)({ token: code, secret: factor.secret, ...TOTP_OPTIONS });
        if (!result || (typeof result === 'object' && !result.valid)) {
            throw new common_1.UnauthorizedException('Invalid TOTP code');
        }
        await this.prisma.mfaFactor.update({
            where: { userId_type: { userId, type: 'TOTP' } },
            data: { confirmed: true },
        });
        await this.prisma.auditLog.create({
            data: {
                actorUserId: userId,
                action: 'MFA_ENABLED',
                resourceType: 'user',
                resourceId: userId,
                metadata: { type: 'TOTP' },
            },
        });
        return { success: true, message: 'TOTP two-factor authentication enabled' };
    }
    async disableTotp(userId, code) {
        const factor = await this.prisma.mfaFactor.findUnique({
            where: { userId_type: { userId, type: 'TOTP' } },
        });
        if (!factor?.confirmed) {
            throw new common_1.BadRequestException('TOTP is not enabled');
        }
        const result = await (0, otplib_1.verify)({ token: code, secret: factor.secret, ...TOTP_OPTIONS });
        if (!result || (typeof result === 'object' && !result.valid)) {
            throw new common_1.UnauthorizedException('Invalid TOTP code');
        }
        await this.prisma.mfaFactor.delete({
            where: { userId_type: { userId, type: 'TOTP' } },
        });
        await this.prisma.auditLog.create({
            data: {
                actorUserId: userId,
                action: 'MFA_DISABLED',
                resourceType: 'user',
                resourceId: userId,
                metadata: { type: 'TOTP' },
            },
        });
        return { success: true, message: 'TOTP disabled' };
    }
    async challenge(mfaToken, code, options) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(mfaToken, {
                secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
            });
        }
        catch {
            throw new common_1.UnauthorizedException('MFA token invalid or expired. Please log in again.');
        }
        if (payload.type !== 'mfa_challenge') {
            throw new common_1.UnauthorizedException('Invalid MFA token type');
        }
        const factor = await this.prisma.mfaFactor.findUnique({
            where: { id: payload.factorId, userId: payload.sub, confirmed: true },
            include: { user: true },
        });
        if (!factor) {
            throw new common_1.UnauthorizedException('MFA factor not found');
        }
        const result = await (0, otplib_1.verify)({ token: code, secret: factor.secret, ...TOTP_OPTIONS });
        if (!result || (typeof result === 'object' && !result.valid)) {
            throw new common_1.UnauthorizedException('Invalid TOTP code');
        }
        return this.authService.issueTokens(factor.user.id, factor.user.email, factor.user.role, options);
    }
    async getStatus(userId) {
        const factors = await this.prisma.mfaFactor.findMany({
            where: { userId },
            select: { type: true, confirmed: true, createdAt: true },
        });
        return {
            totpEnabled: factors.some((f) => f.type === 'TOTP' && f.confirmed),
            factors: factors.map((f) => ({
                type: f.type,
                confirmed: f.confirmed,
                enrolledAt: f.createdAt,
            })),
        };
    }
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        auth_service_1.AuthService])
], MfaService);
//# sourceMappingURL=mfa.service.js.map