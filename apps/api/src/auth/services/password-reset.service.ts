import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

/** How long a reset link stays valid. Short enough to limit exposure. */
const TOKEN_TTL_MINUTES = 60;
/** Most reset emails one account can trigger inside the window. */
const MAX_REQUESTS_PER_WINDOW = 5;
const REQUEST_WINDOW_MINUTES = 15;

/**
 * Forgotten-password recovery.
 *
 * Four properties do the real work here:
 *
 * 1. **No account enumeration.** `requestReset` returns the same response
 *    whether or not the address exists, so the endpoint can't be used to
 *    discover who has an account.
 * 2. **The token is stored hashed.** Only SHA-256(token) is persisted, so a
 *    database leak doesn't hand an attacker the ability to reset every account.
 *    (SHA-256, not argon2: the token is 256 bits of entropy we generated, so
 *    it isn't brute-forceable and doesn't need a slow KDF — and lookup has to
 *    be a single indexed query.)
 * 3. **Single use, short lived.** Redeeming marks it used and invalidates every
 *    other outstanding token for that account.
 * 4. **Every session is revoked on reset.** Someone resetting a password may be
 *    locking an intruder out, so the intruder's refresh token must die too.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    config: ConfigService,
  ) {
    this.webUrl = config.get<string>('WEB_URL', 'http://localhost:3000');
  }

  /**
   * Start a reset. Always resolves the same way — the caller must not be able
   * to tell whether the address is registered.
   */
  async requestReset(email: string): Promise<{ ok: true }> {
    const generic = { ok: true } as const;
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, fullName: true, passwordHash: true, isActive: true },
    });

    // Silently stop for unknown addresses, deactivated accounts, and SSO
    // accounts that have no local password to reset.
    if (!user || !user.isActive || !user.passwordHash) return generic;

    // Throttle per account so the mailbox can't be flooded.
    const since = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60_000);
    const recent = await this.prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: since } },
    });
    if (recent >= MAX_REQUESTS_PER_WINDOW) {
      this.logger.warn(`Password reset throttled for user ${user.id}`);
      return generic;
    }

    const token = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000),
      },
    });

    const link = `${this.webUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const firstName = user.fullName?.trim().split(/\s+/)[0] || 'there';

    // Delivery failure must not change the response — that would leak which
    // addresses exist just as surely as a different status code.
    try {
      await this.notifications.sendEmail({
        to: user.email,
        subject: 'Reset your Dhyana Stays password',
        html:
          `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
          `<p>Hi ${escapeHtml(firstName)},</p>` +
          `<p>We received a request to reset your Dhyana Stays password. ` +
          `This link works once and expires in ${TOKEN_TTL_MINUTES} minutes:</p>` +
          `<p><a href="${link}">Reset my password</a></p>` +
          `<p>If you didn't ask for this, you can ignore this email — your password won't change.</p>` +
          `</div>`,
        text:
          `Hi ${firstName},\n\nReset your Dhyana Stays password using this link ` +
          `(valid once, expires in ${TOKEN_TTL_MINUTES} minutes):\n\n${link}\n\n` +
          `If you didn't ask for this, ignore this email — your password won't change.`,
      });
    } catch (err) {
      this.logger.error(`Failed to send reset email to user ${user.id}: ${String(err)}`);
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        resourceType: 'user',
        resourceId: user.id,
        metadata: {},
      },
    });

    return generic;
  }

  /** Redeem a token and set a new password. */
  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, passwordHash: true, isActive: true } } },
    });

    // One message for every failure mode — expired, already used, never
    // existed — so probing tells an attacker nothing.
    const invalid = () =>
      new BadRequestException('This reset link is invalid or has expired. Please request a new one.');

    if (!record || record.usedAt || record.expiresAt < new Date()) throw invalid();
    if (!record.user?.isActive || !record.user.passwordHash) throw invalid();

    // Reusing the current password defeats the point of resetting it.
    if (await argon2.verify(record.user.passwordHash, newPassword)) {
      throw new BadRequestException(
        'Your new password must be different from your current one.',
      );
    }

    const passwordHash = await argon2.hash(newPassword);
    const userId = record.user.id;
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Burn this token…
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      // …and every other outstanding one for this account.
      this.prisma.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      }),
      // Whoever they're locking out loses their session too.
      this.prisma.refreshTokenFamily.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'PASSWORD_RESET' },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'AUTH_PASSWORD_RESET_COMPLETED',
          resourceType: 'user',
          resourceId: userId,
          metadata: { sessionsRevoked: true },
        },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${userId}`);
    return { ok: true };
  }

  /** Is this token still redeemable? Powers the reset page's up-front check. */
  async checkToken(token: string): Promise<{ valid: boolean }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { usedAt: true, expiresAt: true },
    });
    return {
      valid: !!record && !record.usedAt && record.expiresAt > new Date(),
    };
  }
}

/** SHA-256 of the raw token — what we store and look up by. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time compare, exported for tests that assert hashing behaviour. */
export function tokenMatches(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
