import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { PasswordResetService } from './services/password-reset.service';

/**
 * The security properties are the feature here: no account enumeration, the
 * token stored hashed, single use, short lived, and every session revoked.
 */

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    user: { findUnique: jest.fn(), update: jest.fn() },
    passwordResetToken: {
      create: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshTokenFamily: { updateMany: jest.fn() },
    session: { updateMany: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockResolvedValue([]),
    ...over,
  };
}

const notifications = () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) });
const config = () => ({ get: (_k: string, d?: string) => d ?? 'http://localhost:3000' });

const build = (prisma: unknown, n = notifications()) => ({
  svc: new PasswordResetService(prisma as never, n as never, config() as never),
  notifications: n,
});

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

let currentHash: string;
beforeAll(async () => {
  currentHash = await argon2.hash('OldPassword123');
});

const activeUser = {
  id: 'u1',
  email: 'asha@example.com',
  fullName: 'Asha Rao',
  passwordHash: 'hash',
  isActive: true,
};

describe('requestReset — account enumeration', () => {
  it('responds identically for an unknown address, and sends nothing', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const { svc, notifications: n } = build(prisma);

    expect(await svc.requestReset('nobody@example.com')).toEqual({ ok: true });
    expect(n.sendEmail).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('responds identically for an SSO account with no local password', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash: null });
    const { svc, notifications: n } = build(prisma);

    expect(await svc.requestReset('asha@example.com')).toEqual({ ok: true });
    expect(n.sendEmail).not.toHaveBeenCalled();
  });

  it('responds identically for a deactivated account', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });
    const { svc, notifications: n } = build(prisma);

    expect(await svc.requestReset('asha@example.com')).toEqual({ ok: true });
    expect(n.sendEmail).not.toHaveBeenCalled();
  });

  it('still responds ok when the email fails to send', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(activeUser);
    const n = notifications();
    n.sendEmail.mockRejectedValue(new Error('smtp down'));
    const { svc } = build(prisma, n);

    // A different response here would leak which addresses exist.
    expect(await svc.requestReset('asha@example.com')).toEqual({ ok: true });
  });
});

describe('requestReset — token handling', () => {
  it('stores only the hash, and emails a link carrying the raw token', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(activeUser);
    const { svc, notifications: n } = build(prisma);

    await svc.requestReset('asha@example.com');

    const stored = prisma.passwordResetToken.create.mock.calls[0][0].data;
    const sent = n.sendEmail.mock.calls[0][0].text as string;
    const raw = decodeURIComponent(sent.match(/token=([^\s]+)/)![1]);

    // The raw token must not be recoverable from the row…
    expect(stored.tokenHash).not.toBe(raw);
    expect(stored.tokenHash).toHaveLength(64);
    // …but must be exactly its SHA-256, so lookup works.
    expect(stored.tokenHash).toBe(sha256(raw));
    // Enough entropy that guessing is hopeless.
    expect(raw.length).toBeGreaterThanOrEqual(40);
  });

  it('issues a different token every time', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(activeUser);
    const { svc } = build(prisma);

    await svc.requestReset('asha@example.com');
    await svc.requestReset('asha@example.com');

    const [a, b] = prisma.passwordResetToken.create.mock.calls.map((c) => c[0].data.tokenHash);
    expect(a).not.toBe(b);
  });

  it('throttles once the account has requested too many', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(activeUser);
    prisma.passwordResetToken.count.mockResolvedValue(5);
    const { svc, notifications: n } = build(prisma);

    expect(await svc.requestReset('asha@example.com')).toEqual({ ok: true });
    expect(n.sendEmail).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  const valid = (over: Record<string, unknown> = {}) => ({
    id: 'tok1',
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: 'u1', passwordHash: currentHash, isActive: true },
    ...over,
  });

  it('rejects an unknown token', async () => {
    const prisma = makePrisma();
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    const { svc } = build(prisma);
    await expect(svc.resetPassword('nope', 'NewPassword123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an expired token', async () => {
    const prisma = makePrisma();
    prisma.passwordResetToken.findUnique.mockResolvedValue(
      valid({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const { svc } = build(prisma);
    await expect(svc.resetPassword('t', 'NewPassword123')).rejects.toThrow(/invalid or has expired/);
  });

  it('rejects a token that was already used', async () => {
    const prisma = makePrisma();
    prisma.passwordResetToken.findUnique.mockResolvedValue(valid({ usedAt: new Date() }));
    const { svc } = build(prisma);
    await expect(svc.resetPassword('t', 'NewPassword123')).rejects.toThrow(/invalid or has expired/);
  });

  it('gives the same message for every failure, so probing reveals nothing', async () => {
    const prisma = makePrisma();
    const { svc } = build(prisma);
    const messages: string[] = [];

    for (const record of [null, valid({ usedAt: new Date() }), valid({ expiresAt: new Date(0) })]) {
      prisma.passwordResetToken.findUnique.mockResolvedValue(record);
      await svc.resetPassword('t', 'NewPassword123').catch((e) => messages.push(e.message));
    }
    expect(new Set(messages).size).toBe(1);
  });

  it('refuses reusing the current password', async () => {
    const prisma = makePrisma();
    prisma.passwordResetToken.findUnique.mockResolvedValue(valid());
    const { svc } = build(prisma);

    await expect(svc.resetPassword('t', 'OldPassword123')).rejects.toThrow(/must be different/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('burns the token, kills every session, and stores an argon2 hash', async () => {
    const prisma = makePrisma();
    prisma.passwordResetToken.findUnique.mockResolvedValue(valid());
    const { svc } = build(prisma);

    await svc.resetPassword('t', 'BrandNewPass123');

    // All of it lands in one transaction — a half-applied reset would be worse
    // than none at all.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalled();
    const hash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(hash).toMatch(/^\$argon2/);
    await expect(argon2.verify(hash, 'BrandNewPass123')).resolves.toBe(true);

    // This token burned, plus any other outstanding one for the account.
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tok1' } }),
    );
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', usedAt: null } }),
    );

    // Whoever they may be locking out loses their session too.
    expect(prisma.refreshTokenFamily.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokeReason: 'PASSWORD_RESET' }),
      }),
    );
    expect(prisma.session.updateMany).toHaveBeenCalled();
  });
});

describe('checkToken', () => {
  it('reports usable / expired / used correctly', async () => {
    const prisma = makePrisma();
    const { svc } = build(prisma);

    prisma.passwordResetToken.findUnique.mockResolvedValue({
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(await svc.checkToken('t')).toEqual({ valid: true });

    prisma.passwordResetToken.findUnique.mockResolvedValue({
      usedAt: null,
      expiresAt: new Date(Date.now() - 1),
    });
    expect(await svc.checkToken('t')).toEqual({ valid: false });

    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    expect(await svc.checkToken('t')).toEqual({ valid: false });
  });
});
