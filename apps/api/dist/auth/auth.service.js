"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_1 = require("@nestjs/jwt");
const argon2 = __importStar(require("argon2"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
const login_rate_limiter_service_1 = require("./services/login-rate-limiter.service");
const referral_service_1 = require("../referral/referral.service");
function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
}
function parseMs(duration) {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);
    if (unit === 'm')
        return value * 60 * 1000;
    if (unit === 'h')
        return value * 60 * 60 * 1000;
    if (unit === 'd')
        return value * 24 * 60 * 60 * 1000;
    return 7 * 24 * 60 * 60 * 1000;
}
let AuthService = class AuthService {
    constructor(prisma, jwtService, loginRateLimiter, referralService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.loginRateLimiter = loginRateLimiter;
        this.referralService = referralService;
    }
    async register(dto) {
        if (dto.role === client_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Admin registration is not self-service');
        }
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email already exists');
        }
        const passwordHash = await argon2.hash(dto.password);
        const user = await this.prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    email: dto.email,
                    passwordHash,
                    fullName: dto.fullName,
                    role: dto.role,
                    kind: dto.role === client_1.UserRole.HOST ? 'OWNER' : 'GUEST',
                },
            });
            if (dto.role === client_1.UserRole.HOST) {
                await tx.host.create({ data: { userId: created.id } });
            }
            await tx.auditLog.create({
                data: {
                    actorUserId: created.id,
                    action: 'AUTH_REGISTER',
                    resourceType: 'user',
                    resourceId: created.id,
                    metadata: { role: created.role },
                },
            });
            return created;
        });
        if (dto.referralCode) {
            void this.referralService.applyReferralCode(user.id, dto.referralCode).catch(() => { });
        }
        return this.issueTokens(user.id, user.email, user.role);
    }
    async login(dto, options) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: {
                mfaFactors: { where: { confirmed: true } },
            },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException('This account uses Auth0 login. Please sign in via Auth0.');
        }
        const valid = await argon2.verify(user.passwordHash, dto.password);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.loginRateLimiter.resetOnSuccess(dto.email);
        const totpFactor = user.mfaFactors.find((f) => f.type === 'TOTP');
        if (totpFactor) {
            const mfaToken = await this.jwtService.signAsync({ sub: user.id, type: 'mfa_challenge', factorId: totpFactor.id }, {
                secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
                expiresIn: '2m',
            });
            return { mfaRequired: true, mfaToken };
        }
        return this.issueTokens(user.id, user.email, user.role, options);
    }
    async refresh(dto, options) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(dto.refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (payload.type !== 'refresh') {
            throw new common_1.UnauthorizedException('Invalid token type');
        }
        const tokenHash = hashToken(payload.jti);
        const stored = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: {
                family: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        if (!stored) {
            throw new common_1.UnauthorizedException('Refresh token not found');
        }
        if (stored.usedAt) {
            await this.prisma.refreshTokenFamily.update({
                where: { id: stored.familyId },
                data: { revokedAt: new Date(), revokeReason: 'TOKEN_REUSE_DETECTED' },
            });
            await this.prisma.auditLog.create({
                data: {
                    actorUserId: stored.family.userId,
                    action: 'AUTH_TOKEN_THEFT_DETECTED',
                    resourceType: 'user',
                    resourceId: stored.family.userId,
                    metadata: { familyId: stored.familyId, tokenId: stored.id },
                },
            });
            throw new common_1.UnauthorizedException('Token reuse detected — all sessions revoked. Please log in again.');
        }
        if (stored.family.revokedAt) {
            throw new common_1.UnauthorizedException('Session has been revoked. Please log in again.');
        }
        if (stored.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        const user = stored.family.user;
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        await this.prisma.refreshToken.update({
            where: { tokenHash },
            data: { usedAt: new Date() },
        });
        return this.issueTokens(user.id, user.email, user.role, {
            ...options,
            familyId: stored.familyId,
        });
    }
    async logout(userId) {
        await this.prisma.refreshTokenFamily.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date(), revokeReason: 'LOGOUT' },
        });
        await this.prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: {
                actorUserId: userId,
                action: 'AUTH_LOGOUT',
                resourceType: 'user',
                resourceId: userId,
                metadata: {},
            },
        });
        return { success: true };
    }
    async logoutSession(userId, familyId) {
        const family = await this.prisma.refreshTokenFamily.findFirst({
            where: { id: familyId, userId },
        });
        if (!family)
            throw new common_1.UnauthorizedException('Session not found');
        await this.prisma.refreshTokenFamily.update({
            where: { id: familyId },
            data: { revokedAt: new Date(), revokeReason: 'DEVICE_LOGOUT' },
        });
        await this.prisma.session.updateMany({
            where: { familyId, userId },
            data: { revokedAt: new Date() },
        });
        return { success: true };
    }
    async getSessions(userId) {
        return this.prisma.session.findMany({
            where: { userId, revokedAt: null },
            orderBy: { lastSeen: 'desc' },
            select: { id: true, familyId: true, device: true, ipAddress: true, lastSeen: true },
        });
    }
    async syncUser(jwtUser, dto) {
        const { sub: auth0Sub, email, role: jwtRole } = jwtUser;
        const resolvedRole = this.mapRole(jwtRole) ?? this.mapRole(dto.desiredRole) ?? client_1.UserRole.GUEST;
        let user = await this.prisma.user.findUnique({ where: { auth0Sub } });
        if (user) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    email: email || user.email,
                    fullName: dto.fullName || user.fullName,
                    isActive: true,
                },
            });
        }
        else {
            const byEmail = await this.prisma.user.findUnique({ where: { email } });
            if (byEmail) {
                user = await this.prisma.user.update({
                    where: { id: byEmail.id },
                    data: { auth0Sub, fullName: dto.fullName || byEmail.fullName, isActive: true },
                });
                await this.prisma.auditLog.create({
                    data: {
                        actorUserId: user.id,
                        action: 'AUTH0_LINK',
                        resourceType: 'user',
                        resourceId: user.id,
                        metadata: { auth0Sub, email },
                    },
                });
            }
            else {
                user = await this.prisma.$transaction(async (tx) => {
                    const created = await tx.user.create({
                        data: {
                            email,
                            fullName: dto.fullName || email.split('@')[0],
                            passwordHash: null,
                            role: resolvedRole,
                            kind: resolvedRole === client_1.UserRole.HOST ? 'OWNER' : resolvedRole === client_1.UserRole.ADMIN ? 'STAFF' : 'GUEST',
                            auth0Sub,
                            isActive: true,
                        },
                    });
                    if (resolvedRole === client_1.UserRole.HOST) {
                        await tx.host.create({ data: { userId: created.id } });
                    }
                    await tx.auditLog.create({
                        data: {
                            actorUserId: created.id,
                            action: 'AUTH0_SYNC_CREATE',
                            resourceType: 'user',
                            resourceId: created.id,
                            metadata: { role: resolvedRole, auth0Sub },
                        },
                    });
                    return created;
                });
            }
        }
        return this.safeProfile(user);
    }
    async getMe(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { hostProfile: true, staffRole: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        return this.safeProfile(user);
    }
    async issueTokens(userId, email, role, options) {
        const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
        const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
        const accessExpiry = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
        const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
        const identity = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { kind: true, staffRole: { select: { level: true } } },
        });
        const accessToken = await this.jwtService.signAsync({
            sub: userId,
            email,
            role,
            ...(identity?.kind && { kind: identity.kind }),
            ...(identity?.staffRole?.level && { adminLevel: identity.staffRole.level }),
        }, { secret: accessSecret, expiresIn: accessExpiry });
        const jti = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(jti);
        const expiresAt = new Date(Date.now() + parseMs(refreshExpiry));
        await this.prisma.$transaction(async (tx) => {
            let familyId = options?.familyId;
            if (!familyId) {
                const family = await tx.refreshTokenFamily.create({
                    data: { userId },
                });
                familyId = family.id;
            }
            await tx.refreshToken.create({
                data: {
                    familyId,
                    tokenHash,
                    expiresAt,
                    ipAddress: options?.ipAddress,
                    userAgent: options?.userAgent,
                },
            });
            await tx.session.upsert({
                where: {
                    id: `sess_${options?.familyId ?? familyId}`,
                },
                create: {
                    id: `sess_${options?.familyId ?? familyId}`,
                    userId,
                    familyId: options?.familyId ?? familyId,
                    device: options?.device ?? options?.userAgent ?? 'unknown',
                    ipAddress: options?.ipAddress ?? 'unknown',
                    lastSeen: new Date(),
                },
                update: {
                    lastSeen: new Date(),
                    ipAddress: options?.ipAddress ?? 'unknown',
                    revokedAt: null,
                },
            });
        });
        const refreshToken = await this.jwtService.signAsync({ sub: userId, jti, type: 'refresh' }, { secret: refreshSecret, expiresIn: refreshExpiry });
        return { accessToken, refreshToken, tokenType: 'Bearer' };
    }
    mapRole(role) {
        if (!role)
            return null;
        const upper = role.toUpperCase();
        if (upper === 'ADMIN')
            return client_1.UserRole.ADMIN;
        if (upper === 'HOST')
            return client_1.UserRole.HOST;
        if (upper === 'GUEST')
            return client_1.UserRole.GUEST;
        return null;
    }
    safeProfile(user) {
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            auth0Sub: user.auth0Sub ?? null,
            createdAt: user.createdAt,
            hostProfile: user.hostProfile
                ? { id: user.hostProfile.id, verificationStatus: user.hostProfile.verificationStatus }
                : null,
            adminLevel: user.staffRole?.level ?? null,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        login_rate_limiter_service_1.LoginRateLimiterService,
        referral_service_1.ReferralService])
], AuthService);
//# sourceMappingURL=auth.service.js.map