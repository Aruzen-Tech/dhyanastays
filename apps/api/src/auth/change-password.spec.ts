import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

/**
 * Changing a password is how someone reacts to a suspected compromise, so the
 * security properties — not the happy path — are what these cover.
 */

function makePrisma() {
  return {
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    refreshTokenFamily: {
      create: jest.fn().mockResolvedValue({ id: 'fam1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    refreshToken: { create: jest.fn().mockResolvedValue({}) },
    session: { upsert: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    // issueTokens writes the new family + token inside a transaction.
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb({
        refreshTokenFamily: { create: jest.fn().mockResolvedValue({ id: 'fam-new' }) },
        refreshToken: { create: jest.fn().mockResolvedValue({}) },
        session: { upsert: jest.fn().mockResolvedValue({}) },
      }),
    ),
  };
}

function build(prisma: unknown) {
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService;
  return new AuthService(
    prisma as never,
    jwt,
    { check: jest.fn().mockResolvedValue({ blocked: false }), resetOnSuccess: jest.fn() } as never,
    { applyReferralCode: jest.fn() } as never,
  );
}

const CURRENT = 'CurrentPass123';
let hash: string;

beforeAll(async () => {
  hash = await argon2.hash(CURRENT);
});

const user = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'asha@example.com',
  role: 'GUEST',
  passwordHash: hash,
  ...over,
});

describe('changePassword', () => {
  it('rejects a wrong current password and records the attempt', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(user());
    const svc = build(prisma);

    await expect(
      svc.changePassword('u1', { currentPassword: 'WrongPass123', newPassword: 'BrandNew123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // The password is not touched…
    expect(prisma.user.update).not.toHaveBeenCalled();
    // …and the failed attempt is auditable.
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'AUTH_PASSWORD_CHANGE_FAILED' }),
      }),
    );
  });

  it('refuses an account with no local password (Auth0/SSO)', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(user({ passwordHash: null }));
    const svc = build(prisma);

    await expect(
      svc.changePassword('u1', { currentPassword: 'x', newPassword: 'BrandNew123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses reusing the current password', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(user());
    const svc = build(prisma);

    await expect(
      svc.changePassword('u1', { currentPassword: CURRENT, newPassword: CURRENT }),
    ).rejects.toThrow(/different from the current one/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('stores a real argon2 hash, never the plaintext', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(user());
    const svc = build(prisma);

    await svc.changePassword('u1', { currentPassword: CURRENT, newPassword: 'BrandNew123' });

    const written = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(written).toMatch(/^\$argon2/);
    expect(written).not.toContain('BrandNew123');
    // …and it genuinely verifies against the new password.
    await expect(argon2.verify(written, 'BrandNew123')).resolves.toBe(true);
  });

  it('revokes every other session, so a stolen refresh token dies with the change', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(user());
    const svc = build(prisma);

    const res = await svc.changePassword('u1', {
      currentPassword: CURRENT,
      newPassword: 'BrandNew123',
    });

    expect(prisma.refreshTokenFamily.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', revokedAt: null },
        data: expect.objectContaining({ revokeReason: 'PASSWORD_CHANGED' }),
      }),
    );
    expect(prisma.session.updateMany).toHaveBeenCalled();
    expect(res.sessionsRevoked).toBe(true);
  });

  it('returns a fresh token pair so the caller stays signed in', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(user());
    const svc = build(prisma);

    const res = await svc.changePassword('u1', {
      currentPassword: CURRENT,
      newPassword: 'BrandNew123',
    });

    // Otherwise the user is logged out of the page they just used.
    expect(res.accessToken).toBeTruthy();
    expect(res.refreshToken).toBeTruthy();
  });

  it('audits the successful change', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(user());
    const svc = build(prisma);

    await svc.changePassword('u1', { currentPassword: CURRENT, newPassword: 'BrandNew123' });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'AUTH_PASSWORD_CHANGED' }),
      }),
    );
  });
});
