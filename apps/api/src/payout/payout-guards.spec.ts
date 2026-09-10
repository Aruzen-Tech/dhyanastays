import { BadRequestException } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutAccountService } from './payout-account.service';
import { evaluatePayoutReadiness } from './payout-readiness';

const READY = {
  verificationStatus: 'APPROVED',
  payoutEnabled: true,
  payoutsBlockedReason: null,
  payoutAccount: { status: 'VERIFIED' },
};

function makePrisma(overrides: Record<string, unknown> = {}) {
  const tx = {
    payoutBatch: { create: jest.fn().mockResolvedValue({ id: 'batch1' }), update: jest.fn() },
    payoutLine: { updateMany: jest.fn() },
  };
  return {
    __tx: tx,
    payoutLine: { findMany: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
    payoutBatch: { findUnique: jest.fn(), findMany: jest.fn() },
    host: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    hostPayoutAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
    ...overrides,
  };
}

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const ledger = () => ({ record: jest.fn().mockResolvedValue(undefined) });
// Route settlement off — these tests cover the manual rail's guards.
const features = (routeOn = false) => ({ isEnabled: jest.fn().mockResolvedValue(routeOn) });
const crypto = () => ({
  encrypt: jest.fn((v: string) => `enc(${v})`),
  decrypt: jest.fn(),
  fingerprint: jest.fn(() => 'fp1'),
  last4: jest.fn((v: string) => v.slice(-4)),
});

// ── The rule itself ────────────────────────────────────────────────────────
describe('evaluatePayoutReadiness', () => {
  it('passes a fully verified host', () => {
    expect(evaluatePayoutReadiness(READY)).toMatchObject({ ready: true, blocks: [] });
  });

  it('blocks a host with no payout account', () => {
    const r = evaluatePayoutReadiness({ ...READY, payoutAccount: null });
    expect(r.ready).toBe(false);
    expect(r.blocks).toContain('NO_PAYOUT_ACCOUNT');
  });

  it('blocks an un-verified (still SUBMITTED) account', () => {
    const r = evaluatePayoutReadiness({ ...READY, payoutAccount: { status: 'SUBMITTED' } });
    expect(r.blocks).toContain('ACCOUNT_NOT_VERIFIED');
  });

  it('blocks an administrative hold and names the reason', () => {
    const r = evaluatePayoutReadiness({ ...READY, payoutsBlockedReason: 'chargeback review' });
    expect(r.blocks).toContain('ADMIN_HOLD');
    expect(r.summary).toContain('chargeback review');
  });

  it('collects every reason at once', () => {
    const r = evaluatePayoutReadiness({
      verificationStatus: 'PENDING',
      payoutEnabled: false,
      payoutsBlockedReason: 'debt',
      payoutAccount: null,
    });
    expect(r.blocks).toEqual([
      'HOST_NOT_VERIFIED',
      'PAYOUTS_DISABLED',
      'NO_PAYOUT_ACCOUNT',
      'ADMIN_HOLD',
    ]);
  });
});

// ── Batch guards ───────────────────────────────────────────────────────────
describe('PayoutService payout guards', () => {
  it('batches only KYC-verified hosts and parks the rest ON_HOLD', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([
      { id: 'l1', hostId: 'h1', bookingId: 'b1', amount: 10_000, host: READY },
      { id: 'l2', hostId: 'h2', bookingId: 'b2', amount: 5_000, host: { ...READY, payoutAccount: null } },
    ]);
    const svc = new PayoutService(prisma as never, audit() as never, ledger() as never, features() as never);

    const res = await svc.runWeeklyBatch('admin1');

    // Only the verified host's line is in the batch.
    expect(res).toMatchObject({
      lineCount: 1,
      totalAmount: 10_000,
      withheld: { lineCount: 1, totalAmount: 5_000, hostCount: 1 },
    });
    expect(prisma.__tx.payoutLine.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['l1'] } } }),
    );
    // The un-verified host's line is held with a readable reason.
    expect(prisma.payoutLine.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['l2'] } },
        data: expect.objectContaining({ status: 'ON_HOLD' }),
      }),
    );
  });

  it('refuses the run when every line is withheld', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([
      { id: 'l1', hostId: 'h1', bookingId: 'b1', amount: 10_000, host: { ...READY, payoutEnabled: false } },
    ]);
    const svc = new PayoutService(prisma as never, audit() as never, ledger() as never, features() as never);

    await expect(svc.runWeeklyBatch('admin1')).rejects.toBeInstanceOf(BadRequestException);
    // …but the line is still parked so it can't be picked up later.
    expect(prisma.payoutLine.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ON_HOLD' }) }),
    );
  });

  it('markBatchPaid refuses when a host lost eligibility after scheduling', async () => {
    const prisma = makePrisma();
    prisma.payoutBatch.findUnique.mockResolvedValue({
      id: 'batch1',
      status: 'SCHEDULED',
      totalAmount: 10_000,
      lines: [{ id: 'l1', hostId: 'h1', bookingId: 'b1', amount: 10_000 }],
    });
    prisma.host.findMany.mockResolvedValue([
      { id: 'h1', ...READY, payoutsBlockedReason: 'fraud review' },
    ]);
    const svc = new PayoutService(prisma as never, audit() as never, ledger() as never, features() as never);

    await expect(svc.markBatchPaid('batch1', 'admin1')).rejects.toThrow(/no longer payout-eligible/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('markBatchPaid proceeds when every host is still eligible', async () => {
    const prisma = makePrisma();
    prisma.payoutBatch.findUnique.mockResolvedValue({
      id: 'batch1',
      status: 'SCHEDULED',
      totalAmount: 10_000,
      lines: [{ id: 'l1', hostId: 'h1', bookingId: 'b1', amount: 10_000 }],
    });
    prisma.host.findMany.mockResolvedValue([{ id: 'h1', ...READY }]);
    const svc = new PayoutService(prisma as never, audit() as never, ledger() as never, features() as never);

    await expect(svc.markBatchPaid('batch1', 'admin1')).resolves.toMatchObject({ status: 'PAID' });
  });

  // With Route on, guest money sits in the aggregator's escrow — moving it by
  // hand would put the platform back in the position RBI's PA/PG guidelines
  // prohibit, so the manual rail must be closed entirely.
  it('closes the manual rail once Route settlement is enabled', async () => {
    const prisma = makePrisma();
    const routeOn = features(true);
    const svc = new PayoutService(
      prisma as never, audit() as never, ledger() as never, routeOn as never,
    );

    await expect(svc.runWeeklyBatch('admin1')).rejects.toThrow(/Route settlement is on/);
    await expect(svc.markBatchPaid('batch1', 'admin1')).rejects.toThrow(/Route settlement is on/);
    // Refused before touching any data.
    expect(prisma.payoutLine.findMany).not.toHaveBeenCalled();
    expect(prisma.payoutBatch.findUnique).not.toHaveBeenCalled();
  });
});

// ── KYC capture ────────────────────────────────────────────────────────────
describe('PayoutAccountService', () => {
  const host = { id: 'h1', ...READY, payoutAccount: null };

  it('encrypts the account number, stores only last4, and re-gates payouts', async () => {
    const prisma = makePrisma();
    prisma.host.findUnique.mockResolvedValue(host);
    prisma.hostPayoutAccount.upsert.mockImplementation(({ create }: { create: unknown }) => ({
      id: 'pa1',
      ...(create as Record<string, unknown>),
      updatedAt: new Date(),
    }));
    prisma.payoutLine.updateMany.mockResolvedValue({ count: 2 });
    const svc = new PayoutAccountService(
      prisma as never,
      audit() as never,
      crypto() as never,
    );

    const res = await svc.submit('u1', {
      method: 'BANK_ACCOUNT',
      legalName: 'Asha Rao',
      accountNumber: '123456789012',
      ifsc: 'HDFC0001234',
      pan: 'ABCDE1234F',
    } as never);

    const written = prisma.hostPayoutAccount.upsert.mock.calls[0][0].create;
    // Plaintext never persisted; ciphertext + last4 are.
    expect(written.accountEnc).toBe('enc(123456789012)');
    expect(written.accountLast4).toBe('9012');
    expect(written.panEnc).toBe('enc(ABCDE1234F)');
    expect(JSON.stringify(written)).not.toContain('"123456789012"');
    // Submitting always requires re-verification.
    expect(written.status).toBe('SUBMITTED');
    expect(prisma.host.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payoutEnabled: false } }),
    );
    // Queued money is parked until the new destination is verified.
    expect(prisma.payoutLine.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ON_HOLD' }) }),
    );
    // The response is masked — no ciphertext, no full number.
    expect(res.account).not.toHaveProperty('accountEnc');
    expect(res.account.accountLast4).toBe('9012');
  });

  it('flags a destination already used by another host without blocking', async () => {
    const prisma = makePrisma();
    prisma.host.findUnique.mockResolvedValue(host);
    prisma.hostPayoutAccount.findFirst.mockResolvedValue({ hostId: 'other-host' });
    prisma.hostPayoutAccount.upsert.mockResolvedValue({ id: 'pa1', updatedAt: new Date() });
    prisma.payoutLine.updateMany.mockResolvedValue({ count: 0 });
    const svc = new PayoutAccountService(prisma as never, audit() as never, crypto() as never);

    const res = await svc.submit('u1', {
      method: 'UPI',
      legalName: 'Asha Rao',
      upiVpa: 'asha@okhdfc',
      pan: 'ABCDE1234F',
    } as never);

    expect(res.duplicateDetected).toBe(true);
  });

  it('verifying enables payouts and releases held lines', async () => {
    const prisma = makePrisma();
    prisma.hostPayoutAccount.findUnique.mockResolvedValue({ id: 'pa1', hostId: 'h1' });
    prisma.hostPayoutAccount.update.mockResolvedValue({
      id: 'pa1',
      status: 'VERIFIED',
      updatedAt: new Date(),
    });
    // readiness re-check inside releaseHeldLines sees a now-ready host
    prisma.host.findUnique.mockResolvedValue(READY);
    prisma.payoutLine.updateMany.mockResolvedValue({ count: 3 });
    const svc = new PayoutAccountService(prisma as never, audit() as never, crypto() as never);

    const res = await svc.adminVerify('h1', { status: 'VERIFIED' } as never, 'admin1');

    expect(prisma.host.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payoutEnabled: true } }),
    );
    expect(prisma.payoutLine.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { hostId: 'h1', status: 'ON_HOLD' },
        data: { status: 'NOT_ELIGIBLE', holdReason: null },
      }),
    );
    expect(res.linesReleased).toBe(3);
  });

  it('rejecting keeps payouts disabled and releases nothing', async () => {
    const prisma = makePrisma();
    prisma.hostPayoutAccount.findUnique.mockResolvedValue({ id: 'pa1', hostId: 'h1' });
    prisma.hostPayoutAccount.update.mockResolvedValue({
      id: 'pa1',
      status: 'REJECTED',
      updatedAt: new Date(),
    });
    const svc = new PayoutAccountService(prisma as never, audit() as never, crypto() as never);

    const res = await svc.adminVerify(
      'h1',
      { status: 'REJECTED', rejectionReason: 'Name does not match PAN' } as never,
      'admin1',
    );

    expect(prisma.host.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payoutEnabled: false } }),
    );
    expect(res.linesReleased).toBe(0);
  });

  it('an admin hold parks lines; lifting it releases them', async () => {
    const prisma = makePrisma();
    prisma.host.findUnique
      .mockResolvedValueOnce({ id: 'h1' }) // existence check for the hold
      .mockResolvedValueOnce(READY); // readiness re-check on release
    prisma.payoutLine.updateMany.mockResolvedValue({ count: 4 });
    const svc = new PayoutAccountService(prisma as never, audit() as never, crypto() as never);

    const held = await svc.adminSetHold('h1', { reason: 'debt recovery' } as never, 'admin1');
    expect(held.payoutsBlockedReason).toBe('debt recovery');
    expect(prisma.payoutLine.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ON_HOLD' }) }),
    );

    const lifted = await svc.adminSetHold('h1', {} as never, 'admin1');
    expect(lifted.payoutsBlockedReason).toBeNull();
  });
});
