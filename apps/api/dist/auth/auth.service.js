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
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
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
                },
            });
            if (dto.role === client_1.UserRole.HOST) {
                await tx.host.create({
                    data: { userId: created.id },
                });
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
        return this.issueTokens(user.id, user.email, user.role);
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
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
        return this.issueTokens(user.id, user.email, user.role);
    }
    async refresh(dto) {
        const user = await this.prisma.user.findFirst({
            where: { refreshToken: dto.refreshToken, isActive: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        return this.issueTokens(user.id, user.email, user.role);
    }
    async logout(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
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
                    data: {
                        auth0Sub,
                        fullName: dto.fullName || byEmail.fullName,
                        isActive: true,
                    },
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
            include: { hostProfile: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return this.safeProfile(user);
    }
    async issueTokens(userId, email, role) {
        const accessToken = await this.jwtService.signAsync({ sub: userId, email, role }, {
            secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        });
        const refreshToken = await this.jwtService.signAsync({ sub: userId, email, role, type: 'refresh' }, {
            secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken },
        });
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
                ? {
                    id: user.hostProfile.id,
                    verificationStatus: user.hostProfile.verificationStatus,
                }
                : null,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map