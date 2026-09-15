import { ForbiddenException } from '@nestjs/common';
import { HostProfileService } from './host-profile.service';

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    host: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    hostProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(({ create }: { create: Record<string, unknown> }) => ({
        id: 'hp1',
        ...create,
        updatedAt: new Date(),
      })),
    },
    ...over,
  };
}

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const crypto = () => ({
  encrypt: jest.fn((v: string) => `enc(${v})`),
  decrypt: jest.fn(),
  fingerprint: jest.fn(),
  last4: jest.fn((v: string) => v.slice(-4)),
});

const build = (prisma: unknown) =>
  new HostProfileService(prisma as never, audit() as never, crypto() as never);

const VALID = {
  legalName: 'Asha Rao',
  addressLine1: '12 Palm Grove',
  city: 'Kochi',
  state: 'Kerala',
  postalCode: '682001',
  pan: 'ABCDE1234F',
  idType: 'PASSPORT',
  idNumber: 'M1234567',
};

const COMPLETE_PROFILE = {
  legalName: 'Asha Rao',
  addressLine1: '12 Palm Grove',
  city: 'Kochi',
  state: 'Kerala',
  postalCode: '682001',
  panEnc: 'enc(...)',
  idEnc: 'enc(...)',
};

describe('host application submission', () => {
  it('encrypts PAN and the ID number, keeping only the last 4', async () => {
    const prisma = makePrisma();
    prisma.host.findUnique.mockResolvedValue({
      id: 'h1', verificationStatus: 'PENDING', rejectionReason: null, profile: null,
    });
    const svc = build(prisma);

    const res = await svc.submit('u1', VALID as never);

    const written = prisma.hostProfile.upsert.mock.calls[0][0].create;
    expect(written.panEnc).toBe('enc(ABCDE1234F)');
    expect(written.panLast4).toBe('234F');
    expect(written.idEnc).toBe('enc(M1234567)');
    expect(written.idLast4).toBe('4567');
    // Plaintext must not survive into the stored row or the response.
    expect(JSON.stringify(written)).not.toContain('"ABCDE1234F"');
    expect(res.profile).not.toHaveProperty('panEnc');
    expect(res.profile).not.toHaveProperty('idEnc');
    expect(res.profile.panLast4).toBe('234F');
  });

  it('returns the host to review and clears a stale rejection', async () => {
    const prisma = makePrisma();
    prisma.host.findUnique.mockResolvedValue({
      id: 'h1', verificationStatus: 'REJECTED', rejectionReason: 'Address unclear', profile: null,
    });
    const svc = build(prisma);

    await svc.submit('u1', VALID as never);

    // A changed legal identity or address must be re-checked.
    expect(prisma.host.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { verificationStatus: 'PENDING', rejectionReason: null },
      }),
    );
  });
});

describe('listing submission gate', () => {
  it('blocks a host with no application and names what is missing', async () => {
    const prisma = makePrisma();
    prisma.hostProfile.findUnique.mockResolvedValue(null);
    const svc = build(prisma);

    await expect(svc.assertCompleteForListing('h1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.assertCompleteForListing('h1')).rejects.toThrow(/host profile/);
  });

  it('lists every missing piece rather than failing on the first', async () => {
    const prisma = makePrisma();
    prisma.hostProfile.findUnique.mockResolvedValue({
      ...COMPLETE_PROFILE, panEnc: null, idEnc: null, postalCode: null,
    });
    const svc = build(prisma);

    await expect(svc.assertCompleteForListing('h1')).rejects.toThrow(/PIN code.*PAN.*photo ID/);
  });

  it('lets a complete application through', async () => {
    const prisma = makePrisma();
    prisma.hostProfile.findUnique.mockResolvedValue(COMPLETE_PROFILE);
    const svc = build(prisma);

    await expect(svc.assertCompleteForListing('h1')).resolves.toBeUndefined();
  });
});

describe('getMine', () => {
  it('reports incompleteness so the host knows they cannot list yet', async () => {
    const prisma = makePrisma();
    prisma.host.findUnique.mockResolvedValue({
      id: 'h1',
      verificationStatus: 'PENDING',
      rejectionReason: null,
      profile: { ...COMPLETE_PROFILE, idEnc: null, updatedAt: new Date() },
    });
    const svc = build(prisma);

    const res = await svc.getMine('u1');

    expect(res.complete).toBe(false);
    expect(res.profile).not.toHaveProperty('idEnc');
  });

  it('surfaces the rejection reason back to the host', async () => {
    const prisma = makePrisma();
    prisma.host.findUnique.mockResolvedValue({
      id: 'h1',
      verificationStatus: 'REJECTED',
      rejectionReason: 'ID document unreadable',
      profile: null,
    });
    const svc = build(prisma);

    expect(await svc.getMine('u1')).toMatchObject({
      verificationStatus: 'REJECTED',
      rejectionReason: 'ID document unreadable',
      complete: false,
    });
  });
});
