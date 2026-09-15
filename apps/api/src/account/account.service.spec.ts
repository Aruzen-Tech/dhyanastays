import { NotFoundException } from '@nestjs/common';
import { AccountService } from './account.service';

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    ...over,
  };
}

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const build = (prisma: unknown, a = audit()) =>
  ({ svc: new AccountService(prisma as never, a as never), audit: a });

const BASE_USER = {
  id: 'u1',
  email: 'asha@example.com',
  fullName: 'Asha Rao',
  phone: '9876543210',
  avatarUrl: null,
  role: 'GUEST',
  kind: 'GUEST',
  createdAt: new Date('2026-01-01'),
  hostProfile: null,
};

describe('AccountService.getProfile', () => {
  it('returns the signed-in user regardless of role', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, role: 'ADMIN' });
    const { svc } = build(prisma);

    const res = await svc.getProfile('u1');

    expect(res).toMatchObject({ email: 'asha@example.com', role: 'ADMIN' });
    expect(res.host).toBeNull();
  });

  it('flags a missing phone on an account created before it was required', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, phone: null });
    const { svc } = build(prisma);

    expect((await svc.getProfile('u1')).missing).toContain('phone');
  });

  it('reports host status without leaking the encrypted identifiers', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({
      ...BASE_USER,
      role: 'HOST',
      hostProfile: {
        id: 'h1',
        verificationStatus: 'PENDING',
        rejectionReason: null,
        profile: { id: 'hp1', panEnc: 'v1.enc', idEnc: 'v1.enc' },
        payoutAccount: { status: 'VERIFIED' },
      },
    });
    const { svc } = build(prisma);

    const res = await svc.getProfile('u1');

    expect(res.host).toEqual({
      verificationStatus: 'PENDING',
      rejectionReason: null,
      applicationComplete: true,
      payoutAccountStatus: 'VERIFIED',
    });
    // Only the fact that identifiers exist, never the ciphertext itself.
    expect(JSON.stringify(res)).not.toContain('v1.enc');
  });

  it('treats a half-finished application as incomplete', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({
      ...BASE_USER,
      role: 'HOST',
      hostProfile: {
        id: 'h1',
        verificationStatus: 'PENDING',
        rejectionReason: null,
        profile: { id: 'hp1', panEnc: 'v1.enc', idEnc: null },
        payoutAccount: null,
      },
    });
    const { svc } = build(prisma);

    const res = await svc.getProfile('u1');
    expect(res.host?.applicationComplete).toBe(false);
    expect(res.host?.payoutAccountStatus).toBeNull();
  });

  it('throws for an unknown user', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const { svc } = build(prisma);
    await expect(svc.getProfile('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AccountService.updateProfile', () => {
  it('writes only the fields that were sent', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(BASE_USER);
    const { svc } = build(prisma);

    await svc.updateProfile('u1', { fullName: 'Asha R. Rao' } as never);

    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ fullName: 'Asha R. Rao' });
  });

  it('audits what actually changed, not everything submitted', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(BASE_USER);
    const { svc, audit: a } = build(prisma);

    // fullName resubmitted unchanged; only the phone is genuinely different.
    await svc.updateProfile('u1', {
      fullName: 'Asha Rao',
      phone: '9000000000',
    } as never);

    expect(a.log).toHaveBeenCalledWith(
      'u1',
      'ACCOUNT_PROFILE_UPDATED',
      'user',
      'u1',
      { fields: ['phone'] },
    );
  });

  it('writes no audit entry when nothing changed', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(BASE_USER);
    const { svc, audit: a } = build(prisma);

    await svc.updateProfile('u1', { fullName: 'Asha Rao' } as never);

    expect(a.log).not.toHaveBeenCalled();
  });
});
