import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import type { RequestUser } from './strategies/jwt.strategy';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { ReferralService } from '../referral/referral.service';

// ─── Token helpers ────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function parseMs(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000; // default 7d
}

interface IssueOptions {
  familyId?: string;       // reuse existing family (rotation) or omit to create new
  ipAddress?: string;
  userAgent?: string;
  device?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly loginRateLimiter: LoginRateLimiterService,
    private readonly referralService: ReferralService,
  ) {}

  // ─── Custom JWT auth ──────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin registration is not self-service');
    }
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: dto.role,
          kind: dto.role === UserRole.HOST ? 'OWNER' : 'GUEST',
        },
      });
      if (dto.role === UserRole.HOST) {
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
      void this.referralService.applyReferralCode(user.id, dto.referralCode).catch(() => {});
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto, options?: IssueOptions) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        mfaFactors: { where: { confirmed: true } },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Auth0 login. Please sign in via Auth0.',
      );
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.loginRateLimiter.resetOnSuccess(dto.email);

    // ── MFA gate ────────────────────────────────────────────────────────────
    const totpFactor = user.mfaFactors.find((f) => f.type === 'TOTP');
    if (totpFactor) {
      // Issue a short-lived MFA challenge token (2 min), no full session yet
      const mfaToken = await this.jwtService.signAsync(
        { sub: user.id, type: 'mfa_challenge', factorId: totpFactor.id },
        {
          secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
          expiresIn: '2m',
        },
      );
      return { mfaRequired: true, mfaToken };
    }

    return this.issueTokens(user.id, user.email, user.role, options);
  }

  async refresh(dto: RefreshDto, options?: IssueOptions) {
    // 1. Verify the JWT signature and expiry
    let payload: { sub: string; jti: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const tokenHash = hashToken(payload.jti);

    // 2. Look up the stored token row
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

    // ── Theft detection ────────────────────────────────────────────────────
    if (!stored) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (stored.usedAt) {
      // Token was already rotated — someone is replaying a used token.
      // Revoke the entire family (all sessions for this login chain).
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
      throw new UnauthorizedException(
        'Token reuse detected — all sessions revoked. Please log in again.',
      );
    }

    if (stored.family.revokedAt) {
      throw new UnauthorizedException('Session has been revoked. Please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = stored.family.user;
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // 3. Mark old token as used (rotate)
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    // 4. Issue new token in the same family
    return this.issueTokens(user.id, user.email, user.role, {
      ...options,
      familyId: stored.familyId,
    });
  }

  async logout(userId: string) {
    // Revoke ALL active families for this user (full logout)
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

  async logoutSession(userId: string, familyId: string) {
    // Revoke a single session (device logout)
    const family = await this.prisma.refreshTokenFamily.findFirst({
      where: { id: familyId, userId },
    });
    if (!family) throw new UnauthorizedException('Session not found');

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

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeen: 'desc' },
      select: { id: true, familyId: true, device: true, ipAddress: true, lastSeen: true },
    });
  }

  // ─── Auth0 sync ───────────────────────────────────────────────────────────

  async syncUser(jwtUser: RequestUser, dto: SyncUserDto) {
    const { sub: auth0Sub, email, role: jwtRole } = jwtUser;
    const resolvedRole =
      this.mapRole(jwtRole) ?? this.mapRole(dto.desiredRole) ?? UserRole.GUEST;

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
    } else {
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
      } else {
        user = await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email,
              fullName: dto.fullName || email.split('@')[0],
              passwordHash: null,
              role: resolvedRole,
              kind: resolvedRole === UserRole.HOST ? 'OWNER' : resolvedRole === UserRole.ADMIN ? 'STAFF' : 'GUEST',
              auth0Sub,
              isActive: true,
            },
          });
          if (resolvedRole === UserRole.HOST) {
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

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { hostProfile: true, staffRole: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.safeProfile(user);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Issues an access + refresh token pair.
   * Creates a new RefreshTokenFamily unless `options.familyId` is provided (rotation).
   */
  async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    options?: IssueOptions,
  ) {
    const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
    const accessExpiry = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      { secret: accessSecret, expiresIn: accessExpiry },
    );

    // Random JTI becomes the refresh token value
    const jti = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(jti);

    const expiresAt = new Date(Date.now() + parseMs(refreshExpiry));

    await this.prisma.$transaction(async (tx) => {
      // Create or reuse family
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

      // Upsert session record
      await tx.session.upsert({
        where: {
          // We use familyId as the session key; one session per family
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

    // Sign the JTI as the refresh token payload
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti, type: 'refresh' },
      { secret: refreshSecret, expiresIn: refreshExpiry },
    );

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  private mapRole(role?: string): UserRole | null {
    if (!role) return null;
    const upper = role.toUpperCase();
    if (upper === 'ADMIN') return UserRole.ADMIN;
    if (upper === 'HOST') return UserRole.HOST;
    if (upper === 'GUEST') return UserRole.GUEST;
    return null;
  }

  private safeProfile(user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    auth0Sub?: string | null;
    createdAt: Date;
    hostProfile?: { id: string; verificationStatus: string } | null;
    staffRole?: { level: string } | null;
  }) {
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
}
