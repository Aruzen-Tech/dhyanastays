import { RoutePayoutService } from './route-payout.service';

const READY_HOST = {
  verificationStatus: 'APPROVED',
  payoutEnabled: true,
  payoutsBlockedReason: null,
  payoutAccount: { status: 'VERIFIED', linkedAccountId: 'acc_host1' },
};

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    payoutLine: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payment: { findFirst: jest.fn().mockResolvedValue({ gatewayPaymentRef: 'pay_1' }) },
    hostPayoutAccount: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const ledger = () => ({ record: jest.fn().mockResolvedValue(undefined) });
const features = (on = true) => ({ isEnabled: jest.fn().mockResolvedValue(on) });
// Tax withholding + debt netting are separately flag-gated; default them to
// inert here so these tests isolate the Route transfer mechanics.
const tax = (t = { tds: 0, tcs: 0, total: 0, tdsRate: 0, tcsRate: 0 }) => ({
  compute: jest.fn().mockResolvedValue(t),
});
const balance = (recovered = 0) => ({
  recoverFromPayout: jest.fn().mockResolvedValue(recovered),
  recordDebt: jest.fn().mockResolvedValue(null),
});
const routeApi = () => ({
  createLinkedAccount: jest.fn().mockResolvedValue({ id: 'acc_new', status: 'created' }),
  createTransfer: jest.fn().mockResolvedValue({ id: 'trf_1', status: 'created', amount: 9000 }),
  fetchTransfer: jest.fn(),
  releaseHold: jest.fn(),
  createReversal: jest.fn().mockResolvedValue({ id: 'rvrsl_1' }),
});

const line = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  hostId: 'h1',
  bookingId: 'b1',
  amount: 9000,
  eligibleAt: new Date('2026-10-01T00:00:00Z'),
  status: 'NOT_ELIGIBLE',
  reversedAmount: 0,
  transferId: null,
  transferStatus: null,
  host: READY_HOST,
  ...over,
});

describe('RoutePayoutService — transfers', () => {
  it('is inert while the payout_route flag is off', async () => {
    const prisma = makePrisma();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never,
      routeApi() as never, features(false) as never, tax() as never, balance() as never,
    );

    expect(await svc.createDueTransfers()).toEqual({ created: 0, skipped: 0, failed: 0 });
    expect(prisma.payoutLine.findMany).not.toHaveBeenCalled();
  });

  it('splits a captured payment, held in escrow until check-in + 24h', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line()]);
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    const res = await svc.createDueTransfers();

    expect(res.created).toBe(1);
    expect(api.createTransfer).toHaveBeenCalledWith(
      'pay_1',
      expect.objectContaining({
        linkedAccountId: 'acc_host1',
        amountPaise: 9000,
        // held until eligibleAt, expressed in unix seconds
        onHoldUntil: Math.floor(new Date('2026-10-01T00:00:00Z').getTime() / 1000),
      }),
    );
    expect(prisma.payoutLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ transferId: 'trf_1', status: 'SCHEDULED' }),
      }),
    );
  });

  it('claims a line before calling the API, and skips one already claimed', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line()]);
    // Another worker won the claim.
    prisma.payoutLine.updateMany.mockResolvedValue({ count: 0 });
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    const res = await svc.createDueTransfers();

    // The guard against double-paying a host: no transfer is created.
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(res).toMatchObject({ created: 0, skipped: 1 });
  });

  it('releases the claim when the transfer call fails, so it retries', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line()]);
    const api = routeApi();
    api.createTransfer.mockRejectedValue(new Error('gateway down'));
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    const res = await svc.createDueTransfers();

    expect(res.failed).toBe(1);
    // Claim reset to null so the next run picks it up again.
    expect(prisma.payoutLine.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ transferStatus: null }) }),
    );
  });

  it('skips hosts that are not payout-ready or have no linked account', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([
      line({ id: 'a', host: { ...READY_HOST, payoutAccount: { status: 'SUBMITTED', linkedAccountId: null } } }),
      line({ id: 'b', host: { ...READY_HOST, payoutAccount: { status: 'VERIFIED', linkedAccountId: null } } }),
    ]);
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    const res = await svc.createDueTransfers();
    expect(res).toMatchObject({ created: 0, skipped: 2 });
    expect(api.createTransfer).not.toHaveBeenCalled();
  });
});

describe('RoutePayoutService — deductions', () => {
  it('transfers gross minus tax minus debt recovery, and records the split', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line()]); // gross 9000
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never,
      // 100 TDS + 500 TCS = 600 tax; then 400 recovered against debt.
      tax({ tds: 100, tcs: 500, total: 600, tdsRate: 0.001, tcsRate: 0.005 }) as never,
      balance(400) as never,
    );

    await svc.createDueTransfers();

    // 9000 - 600 tax - 400 debt = 8000 actually sent.
    expect(api.createTransfer).toHaveBeenCalledWith(
      'pay_1',
      expect.objectContaining({ amountPaise: 8000 }),
    );
    expect(prisma.payoutLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tdsAmount: 100,
          tcsAmount: 500,
          nettedAmount: 400,
          transferAmount: 8000,
        }),
      }),
    );
  });

  it('recovers debt only from what is left after tax', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line()]);
    const bal = balance(0);
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, routeApi() as never,
      features() as never,
      tax({ tds: 100, tcs: 500, total: 600, tdsRate: 0.001, tcsRate: 0.005 }) as never,
      bal as never,
    );

    await svc.createDueTransfers();

    // Statutory withholding comes first: 9000 - 600 = 8400 offered to recovery.
    expect(bal.recoverFromPayout).toHaveBeenCalledWith('h1', 8400, expect.anything());
  });

  it('settles the line without a transfer when deductions consume it entirely', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line()]); // gross 9000
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never,
      tax() as never,
      balance(9000) as never, // the whole payout goes to debt
    );

    const res = await svc.createDueTransfers();

    // Nothing to send — but the line is settled, not retried forever.
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(res.created).toBe(1);
    expect(prisma.payoutLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID', transferAmount: 0, nettedAmount: 9000 }),
      }),
    );
  });
});

describe('RoutePayoutService — transfer events', () => {
  it('marks the line PAID and writes the ledger once on processed', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findUnique.mockResolvedValue(
      line({ transferId: 'trf_1', transferStatus: 'pending', status: 'SCHEDULED' }),
    );
    const led = ledger();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, led as never, routeApi() as never, features() as never, tax() as never, balance() as never,
    );

    await svc.applyTransferEvent({ id: 'trf_1', status: 'processed', amount: 9000 });

    expect(prisma.payoutLine.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
    );
    expect(led.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PAYOUT_SENT', amount: 9000 }),
    );
  });

  it('is idempotent — a re-delivered event does nothing', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findUnique.mockResolvedValue(
      line({ transferId: 'trf_1', transferStatus: 'processed', status: 'PAID' }),
    );
    const led = ledger();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, led as never, routeApi() as never, features() as never, tax() as never, balance() as never,
    );

    await svc.applyTransferEvent({ id: 'trf_1', status: 'processed', amount: 9000 });

    expect(prisma.payoutLine.update).not.toHaveBeenCalled();
    expect(led.record).not.toHaveBeenCalled();
  });

  it('parks the line ON_HOLD when the transfer fails', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findUnique.mockResolvedValue(
      line({ transferId: 'trf_1', transferStatus: 'pending', status: 'SCHEDULED' }),
    );
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, routeApi() as never, features() as never, tax() as never, balance() as never,
    );

    await svc.applyTransferEvent({
      id: 'trf_1',
      status: 'failed',
      amount: 9000,
      error: { description: 'beneficiary invalid' },
    });

    expect(prisma.payoutLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ON_HOLD',
          holdReason: 'Route transfer failed: beneficiary invalid',
        }),
      }),
    );
  });
});

describe('RoutePayoutService — reversals', () => {
  it('reverses no more than what is left of the transfer', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findFirst.mockResolvedValue(
      line({ transferId: 'trf_1', status: 'PAID', amount: 9000, reversedAmount: 2000 }),
    );
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    // Refund is larger than the remaining 7000 — must cap.
    const res = await svc.reverseForRefund('b1', 50_000, 'admin1');

    expect(res).toEqual({ reversed: 7000 });
    expect(api.createReversal).toHaveBeenCalledWith('trf_1', 7000);
  });

  it('turns a refund larger than the transfer into host debt', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findFirst.mockResolvedValue(
      line({ transferId: 'trf_1', status: 'PAID', amount: 9000, transferAmount: 8000, reversedAmount: 0 }),
    );
    const api = routeApi();
    const bal = balance();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never,
      tax() as never, bal as never,
    );

    // Guest is refunded 12000 but we only ever sent the host 8000.
    const res = await svc.reverseForRefund('b1', 12_000, 'admin1');

    expect(res).toEqual({ reversed: 8000 });
    expect(api.createReversal).toHaveBeenCalledWith('trf_1', 8000);
    // The 4000 we could not claw back is recorded so a later payout nets it off.
    expect(bal.recordDebt).toHaveBeenCalledWith(
      'h1',
      4000,
      expect.stringContaining('Refund exceeded'),
      expect.objectContaining({ bookingId: 'b1' }),
    );
  });

  it('caps the reversal at what was actually transferred, not the gross', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findFirst.mockResolvedValue(
      line({ transferId: 'trf_1', status: 'PAID', amount: 9000, transferAmount: 8000, reversedAmount: 0 }),
    );
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never,
      tax() as never, balance() as never,
    );

    await svc.reverseForRefund('b1', 9000, null);

    // 8000 was sent (9000 gross less deductions) - never try to claw back more.
    expect(api.createReversal).toHaveBeenCalledWith('trf_1', 8000);
  });

  it('does nothing when no transfer was ever made', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findFirst.mockResolvedValue(null);
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    expect(await svc.reverseForRefund('b1', 5000, null)).toBeNull();
    expect(api.createReversal).not.toHaveBeenCalled();
  });
});

describe('RoutePayoutService — linked accounts', () => {
  it('is idempotent when the host is already onboarded', async () => {
    const prisma = makePrisma();
    prisma.hostPayoutAccount.findUnique.mockResolvedValue({
      id: 'pa1', status: 'VERIFIED', linkedAccountId: 'acc_existing',
      host: { user: { email: 'a@x.com', phone: null } },
    });
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    expect(await svc.ensureLinkedAccount('h1')).toBe('acc_existing');
    expect(api.createLinkedAccount).not.toHaveBeenCalled();
  });

  it('refuses to onboard an unverified payout account', async () => {
    const prisma = makePrisma();
    prisma.hostPayoutAccount.findUnique.mockResolvedValue({
      id: 'pa1', status: 'SUBMITTED', linkedAccountId: null,
      host: { user: { email: 'a@x.com', phone: null } },
    });
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, routeApi() as never, features() as never, tax() as never, balance() as never,
    );

    await expect(svc.ensureLinkedAccount('h1')).rejects.toThrow(/must be verified/);
  });

  it('creates and stores the linked account for a verified host', async () => {
    const prisma = makePrisma();
    prisma.hostPayoutAccount.findUnique.mockResolvedValue({
      id: 'pa1', status: 'VERIFIED', linkedAccountId: null, legalName: 'Asha Rao',
      host: { user: { email: 'asha@x.com', phone: '+919876543210' } },
    });
    const api = routeApi();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, api as never, features() as never, tax() as never, balance() as never,
    );

    expect(await svc.ensureLinkedAccount('h1')).toBe('acc_new');
    expect(prisma.hostPayoutAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ linkedAccountId: 'acc_new' }) }),
    );
  });
});
