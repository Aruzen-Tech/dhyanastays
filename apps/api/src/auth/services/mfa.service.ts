import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generate, generateSecret, generateURI, verify } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { AuthService } from '../auth.service';

// TOTP options: 30 s step, 6 digits, window ±1 (tolerates 30 s clock drift)
const TOTP_OPTIONS = { digits: 6, step: 30, window: 1 } as const;

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  // ─── Setup: generate secret + OTP auth URL ───────────────────────────────

  async setupTotp(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const existing = await this.prisma.mfaFactor.findUnique({
      where: { userId_type: { userId, type: 'TOTP' } },
    });
    if (existing?.confirmed) {
      throw new BadRequestException('TOTP is already enabled. Disable it first to re-enroll.');
    }

    const secret = generateSecret();
    const otpAuthUrl = generateURI({ label: user.email, secret, issuer: 'DhyanaStays' });

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

  // ─── Confirm: user proves they scanned the QR correctly ──────────────────

  async confirmTotp(userId: string, code: string) {
    const factor = await this.prisma.mfaFactor.findUnique({
      where: { userId_type: { userId, type: 'TOTP' } },
    });
    if (!factor || factor.confirmed) {
      throw new BadRequestException('No pending TOTP setup found');
    }

    const result = await verify({ token: code, secret: factor.secret, ...TOTP_OPTIONS });
    if (!result || (typeof result === 'object' && !result.valid)) {
      throw new UnauthorizedException('Invalid TOTP code');
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

  // ─── Disable ──────────────────────────────────────────────────────────────

  async disableTotp(userId: string, code: string) {
    const factor = await this.prisma.mfaFactor.findUnique({
      where: { userId_type: { userId, type: 'TOTP' } },
    });
    if (!factor?.confirmed) {
      throw new BadRequestException('TOTP is not enabled');
    }

    const result = await verify({ token: code, secret: factor.secret, ...TOTP_OPTIONS });
    if (!result || (typeof result === 'object' && !result.valid)) {
      throw new UnauthorizedException('Invalid TOTP code');
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

  // ─── Challenge: complete login for MFA-protected accounts ────────────────

  async challenge(
    mfaToken: string,
    code: string,
    options?: { ipAddress?: string; userAgent?: string },
  ) {
    let payload: { sub: string; type: string; factorId: string };
    try {
      payload = await this.jwtService.verifyAsync(mfaToken, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      });
    } catch {
      throw new UnauthorizedException('MFA token invalid or expired. Please log in again.');
    }

    if (payload.type !== 'mfa_challenge') {
      throw new UnauthorizedException('Invalid MFA token type');
    }

    const factor = await this.prisma.mfaFactor.findUnique({
      where: { id: payload.factorId, userId: payload.sub, confirmed: true },
      include: { user: true },
    });
    if (!factor) {
      throw new UnauthorizedException('MFA factor not found');
    }

    const result = await verify({ token: code, secret: factor.secret, ...TOTP_OPTIONS });
    if (!result || (typeof result === 'object' && !result.valid)) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    return this.authService.issueTokens(
      factor.user.id,
      factor.user.email,
      factor.user.role as UserRole,
      options,
    );
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async getStatus(userId: string) {
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
}
