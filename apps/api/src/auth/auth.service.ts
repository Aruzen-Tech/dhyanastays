import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import type { RequestUser } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Custom JWT auth (used when AUTH0_DOMAIN is NOT set) ──────────────────

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
        },
      });
      if (dto.role === UserRole.HOST) {
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

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(dto: RefreshDto) {
    const user = await this.prisma.user.findFirst({
      where: { refreshToken: dto.refreshToken, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
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

  // ─── Auth0 sync (called after Auth0 login) ────────────────────────────────

  /**
   * Upserts a user record from an Auth0 JWT payload.
   *
   * Logic:
   *  1. Find by auth0Sub → update if found
   *  2. Find by email → link auth0Sub if found (migration path)
   *  3. Create new user with role from JWT claim or desiredRole body param
   *
   * Returns a safe user profile (no passwordHash).
   */
  async syncUser(jwtUser: RequestUser, dto: SyncUserDto) {
    const { sub: auth0Sub, email, role: jwtRole } = jwtUser;

    // Determine role: JWT claim wins, then desiredRole body, then GUEST default
    const resolvedRole = this.mapRole(jwtRole) ?? this.mapRole(dto.desiredRole) ?? UserRole.GUEST;

    // 1. Find by auth0Sub
    let user = await this.prisma.user.findUnique({ where: { auth0Sub } });

    if (user) {
      // Already linked — update email/name if changed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: email || user.email,
          fullName: dto.fullName || user.fullName,
          isActive: true,
        },
      });
    } else {
      // 2. Find by email (migration: existing custom-auth user logging in via Auth0)
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
      } else {
        // 3. Create brand-new user
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

  // ─── GET /auth/me ─────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { hostProfile: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.safeProfile(user);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, role, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
      },
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
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
        ? {
            id: user.hostProfile.id,
            verificationStatus: user.hostProfile.verificationStatus,
          }
        : null,
    };
  }
}
