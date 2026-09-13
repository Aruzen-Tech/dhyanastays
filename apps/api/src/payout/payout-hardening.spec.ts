import { assertDeductionsBalance, RoutePayoutService } from './route-payout.service';
import { HostBalanceService } from './host-balance.service';

/**
 * Hardening tests: the failure modes where money is actually lost or
 * duplicated, rather than the happy paths covered in route-payout.service.spec.
 */

const READY_HOST = {
  verificationStatus: 'APPROVED',
  payoutEnabled: true,
  payoutsBlockedReason: null,
  payoutAccount: { status: 'VERIFIED', linkedAccountId: 'acc_host1' },
};

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const ledger = () => ({ record: jest.fn().mockResolvedValue(undefined) });
const features = (on = true) => ({ isEnabled: jest.fn().mockResolvedValue(on) });
const tax = (t = { tds: 0, tcs: 0, total: 0, tdsRate: 0, tcsRate: 0 }) => ({
  compute: jest.fn().mockResolvedValue(t),
});
const balance = (recovered = 0) => ({
  recoverFromPayout: jest.fn().mockResolvedValue(recovered),
  recordDebt: jest.fn().mockResolvedValue(null),
});

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    payoutLine: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payment: { findUnique: jest.fn(), findFirst: jest.fn() },
    hostPayoutAccount: { findUnique: jest.fn(), update: jest.fn() },
    ...over,
  };
}

const routeApi = (over: Record<string, unknown> = {}) => ({
  createLinkedAccount: jest.fn(),
  createTransfer: jest.fn().mockResolvedValue({ id: 'trf_1', status: 'created', amount: 9000 }),
  fetchTransfer: jest.fn(),
  listPaymentTransfers: jest.fn().mockResolvedValue([]),
  releaseHold: jest.fn(),
  createReversal: jest.fn().mockResolvedValue({ id: 'rvrsl_1' }),
  ...over,
});

const line = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  hostId: 'h1',
  bookingId: 'b1',
  paymentId: 'pay-row-1',
  amount: 9000,
  eligibleAt: new Date('2026-10-01T00:00:00Z'),
  status: 'NOT_ELIGIBLE',
  reversedAmount: 0,
  transferId: null,
  transferStatus: null,
  reversalRef: null,
  host: READY_HOST,
  ...over,
});

const build = (prisma: unknown, api: unknown, extra: { tax?: unknown; bal?: unknown } = {}) =>
  new RoutePayoutService(
    prisma as never,
    audit() as never,
    ledger() as never,
    api as never,
    features() as never,
    (extra.tax ?? tax()) as never,
    (extra.bal ?? balance()) as never,
  );

// ── Money arithmetic ───────────────────────────────────────────────────────
describe('assertDeductionsBalance', () => {
  it('accepts a reconciling split', () => {
    expect(() => assertDeductionsBalance('l1', 9000, 600, 400, 8000)).not.toThrow();
  });

  it('rejects a split that does not add up to the gross', () => {
    expect(() => assertDeductionsBalance('l1', 9000, 600, 400, 7999)).toThrow(/do not reconcile/);
  });

  it('rejects any negative component', () => {
    expect(() => assertDeductionsBalance('l1', 9000, -1, 0, 9001)).toThrow(/negative component/);
  });
});

// ── Funding payment selection ──────────────────────────────────────────────
describe('funding payment selection', () => {
  it('splits from the capture that funded THIS line, not the latest one', async () => {
    // A DEPOSIT_50 booking has two captures; this line belongs to the first.
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line({ paymentId: 'pay-row-1' })]);
    prisma.payment.findUnique.mockResolvedValue({
      status: 'CAPTURED',
      gatewayPaymentRef: 'pay_deposit',
    });
    const api = routeApi();
    await build(prisma, api).createDueTransfers();

    expect(prisma.payment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pay-row-1' } }),
    );
    expect(api.createTransfer).toHaveBeenCalledWith('pay_deposit', expect.anything());
    // Must NOT fall back to "latest capture on the booking".
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('skips a line whose funding payment is not captured', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line()]);
    prisma.payment.findUnique.mockResolvedValue({ status: 'INITIATED', gatewayPaymentRef: null });
    const api = routeApi();

    const res = await build(prisma, api).createDueTransfers();

    expect(res).toMatchObject({ created: 0, skipped: 1 });
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it('falls back to the booking lookup only for legacy lines with no paymentId', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([line({ paymentId: null })]);
    prisma.payment.findFirst.mockResolvedValue({ gatewayPaymentRef: 'pay_legacy' });
    const api = routeApi();

    await build(prisma, api).createDueTransfers();

    expect(api.createTransfer).toHaveBeenCalledWith('pay_legacy', expect.anything());
  });
});

// ── Orphaned claim recovery ────────────────────────────────────────────────
describe('recoverStuckClaims', () => {
  const stuckLine = { id: 'l1', bookingId: 'b1', paymentId: 'pay-row-1' };

  it('adopts a transfer that was created but never recorded', async () => {
    // The crash case: Razorpay has the transfer, we do not.
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([stuckLine]);
    prisma.payment.findUnique.mockResolvedValue({
      status: 'CAPTURED',
      gatewayPaymentRef: 'pay_1',
    });
    const api = routeApi({
      listPaymentTransfers: jest.fn().mockResolvedValue([
        { id: 'trf_orphan', status: 'pending', amount: 9000, notes: { payoutLineId: 'l1' } },
      ]),
    });

    const res = await build(prisma, api).recoverStuckClaims();

    expect(res).toEqual({ adopted: 1, released: 0 });
    expect(prisma.payoutLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transferId: 'trf_orphan',
          status: 'SCHEDULED',
          claimedAt: null,
        }),
      }),
    );
  });

  it('ignores transfers on the same payment that belong to another line', async () => {
    // Both payout lines of a DEPOSIT_50 booking split the same payment.
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([stuckLine]);
    prisma.payment.findUnique.mockResolvedValue({
      status: 'CAPTURED',
      gatewayPaymentRef: 'pay_1',
    });
    const api = routeApi({
      listPaymentTransfers: jest.fn().mockResolvedValue([
        { id: 'trf_other', status: 'processed', amount: 500, notes: { payoutLineId: 'someone-else' } },
      ]),
    });

    const res = await build(prisma, api).recoverStuckClaims();

    // Not ours → release the claim and retry, never adopt another line's money.
    expect(res).toEqual({ adopted: 0, released: 1 });
    expect(prisma.payoutLine.update).not.toHaveBeenCalled();
  });

  it('releases the claim when the transfer never landed', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([stuckLine]);
    prisma.payment.findUnique.mockResolvedValue({
      status: 'CAPTURED',
      gatewayPaymentRef: 'pay_1',
    });

    const res = await build(prisma, routeApi()).recoverStuckClaims();

    expect(res).toEqual({ adopted: 0, released: 1 });
    expect(prisma.payoutLine.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { transferStatus: null, claimedAt: null } }),
    );
  });

  it('leaves the claim alone when the gateway lookup fails', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findMany.mockResolvedValue([stuckLine]);
    prisma.payment.findUnique.mockResolvedValue({
      status: 'CAPTURED',
      gatewayPaymentRef: 'pay_1',
    });
    const api = routeApi({
      listPaymentTransfers: jest.fn().mockRejectedValue(new Error('gateway down')),
    });

    const res = await build(prisma, api).recoverStuckClaims();

    // Never guess when we cannot see the gateway's state.
    expect(res).toEqual({ adopted: 0, released: 0 });
    expect(prisma.payoutLine.updateMany).not.toHaveBeenCalled();
  });

  it('is inert while the flag is off', async () => {
    const prisma = makePrisma();
    const svc = new RoutePayoutService(
      prisma as never, audit() as never, ledger() as never, routeApi() as never,
      features(false) as never, tax() as never, balance() as never,
    );
    expect(await svc.recoverStuckClaims()).toEqual({ adopted: 0, released: 0 });
    expect(prisma.payoutLine.findMany).not.toHaveBeenCalled();
  });
});

// ── Reversal idempotency ───────────────────────────────────────────────────
describe('reversal idempotency', () => {
  it('does not claw back twice for a redelivered refund', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findFirst.mockResolvedValue(
      line({ transferId: 'trf_1', status: 'PAID', transferAmount: 8000, reversalRef: 'rfnd_1' }),
    );
    const api = routeApi();

    const res = await build(prisma, api).reverseForRefund('b1', 8000, null, 'rfnd_1');

    expect(res).toEqual({ reversed: 0 });
    expect(api.createReversal).not.toHaveBeenCalled();
  });

  it('still reverses a genuinely different refund on the same line', async () => {
    const prisma = makePrisma();
    prisma.payoutLine.findFirst.mockResolvedValue(
      line({ transferId: 'trf_1', status: 'PAID', transferAmount: 8000, reversedAmount: 1000, reversalRef: 'rfnd_1' }),
    );
    const api = routeApi();

    const res = await build(prisma, api).reverseForRefund('b1', 2000, null, 'rfnd_2');

    expect(res).toEqual({ reversed: 2000 });
    expect(api.createReversal).toHaveBeenCalledWith('trf_1', 2000);
  });
});

// ── Concurrent debt recovery ───────────────────────────────────────────────
describe('HostBalanceService concurrency', () => {
  it('locks the host row and re-reads the balance inside the transaction', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'h1' }]),
      hostBalanceEntry: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: -2000 } }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
      hostBalanceEntry: {
        // If this outer (unlocked) aggregate were used, two concurrent payouts
        // could both recover the same debt.
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: -999999 } }),
        create: jest.fn(),
      },
    };
    const svc = new HostBalanceService(prisma as never, audit() as never);

    const recovered = await svc.recoverFromPayout('h1', 9000);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalled(); // SELECT ... FOR UPDATE
    // Used the locked read (-2000), not the stale outer one.
    expect(recovered).toBe(2000);
    expect(prisma.hostBalanceEntry.create).not.toHaveBeenCalled();
    expect(tx.hostBalanceEntry.create).toHaveBeenCalled();
  });

  it('joins the caller transaction when one is supplied', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'h1' }]),
      hostBalanceEntry: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: -500 } }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = { $transaction: jest.fn() };
    const svc = new HostBalanceService(prisma as never, audit() as never);

    expect(await svc.recoverFromPayout('h1', 9000, { tx })).toBe(500);
    // No nested transaction — the caller's atomicity is preserved.
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
