import { HostBalanceService } from './host-balance.service';
import { PayoutTaxService } from './payout-tax.service';

function makePrisma(entries: Array<{ amount: number }> = []) {
  const sum = entries.reduce((s, e) => s + e.amount, 0);
  const hostBalanceEntry = {
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: sum } }),
    create: jest.fn().mockImplementation(({ data }: { data: unknown }) => ({ id: 'e1', ...(data as object) })),
    findMany: jest.fn().mockResolvedValue(entries),
  };
  // recoverFromPayout locks the Host row and re-reads inside a transaction, so
  // the tx client must expose the same surface as the base client.
  const tx = { $queryRaw: jest.fn().mockResolvedValue([{ id: 'h1' }]), hostBalanceEntry };
  return {
    hostBalanceEntry,
    host: { findUnique: jest.fn().mockResolvedValue({ id: 'h1' }) },
    $queryRaw: tx.$queryRaw,
    $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
  };
}
const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

describe('HostBalanceService', () => {
  it('stores debt as a negative entry and reports it as positive outstanding', async () => {
    const prisma = makePrisma([{ amount: -5000 }]);
    const svc = new HostBalanceService(prisma as never, audit() as never);

    await svc.recordDebt('h1', 3000, 'refund shortfall', { bookingId: 'b1' });

    expect(prisma.hostBalanceEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'DEBT', amount: -3000 }),
      }),
    );
    // Existing ledger sums to -5000 → 5000 owed.
    expect(await svc.outstandingDebt('h1')).toBe(5000);
  });

  it('ignores a zero or negative debt', async () => {
    const prisma = makePrisma();
    const svc = new HostBalanceService(prisma as never, audit() as never);
    expect(await svc.recordDebt('h1', 0, 'noop')).toBeNull();
    expect(prisma.hostBalanceEntry.create).not.toHaveBeenCalled();
  });

  it('recovers only up to the outstanding debt', async () => {
    const prisma = makePrisma([{ amount: -2000 }]); // owes 2000
    const svc = new HostBalanceService(prisma as never, audit() as never);

    // 9000 available, but only 2000 is owed.
    expect(await svc.recoverFromPayout('h1', 9000)).toBe(2000);
    expect(prisma.hostBalanceEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'RECOVERY', amount: 2000 }) }),
    );
  });

  it('recovers only what the payout can cover', async () => {
    const prisma = makePrisma([{ amount: -9000 }]); // owes 9000
    const svc = new HostBalanceService(prisma as never, audit() as never);

    expect(await svc.recoverFromPayout('h1', 1500)).toBe(1500);
  });

  it('recovers nothing when the host owes nothing', async () => {
    const prisma = makePrisma([{ amount: 0 }]);
    const svc = new HostBalanceService(prisma as never, audit() as never);

    expect(await svc.recoverFromPayout('h1', 9000)).toBe(0);
    expect(prisma.hostBalanceEntry.create).not.toHaveBeenCalled();
  });

  it('records a staff adjustment with the actor and reason', async () => {
    const prisma = makePrisma([{ amount: -1000 }]);
    const aud = audit();
    const svc = new HostBalanceService(prisma as never, aud as never);

    await svc.adjust('h1', 1000, 'goodwill write-off', 'admin1');

    expect(prisma.hostBalanceEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'ADJUSTMENT', amount: 1000, createdById: 'admin1' }),
      }),
    );
    expect(aud.log).toHaveBeenCalled();
  });
});

// ── Tax withholding ────────────────────────────────────────────────────────
const config = (rates: Record<string, number> = {}) =>
  ({ get: (k: string, d: number) => rates[k] ?? d }) as never;
const flags = (on: boolean) => ({ isEnabled: jest.fn().mockResolvedValue(on) }) as never;

describe('PayoutTaxService', () => {
  it('withholds nothing while the flag is off', async () => {
    const svc = new PayoutTaxService(config(), flags(false));
    expect(await svc.compute(100_000)).toMatchObject({ tds: 0, tcs: 0, total: 0 });
  });

  it('applies the configured rates', async () => {
    // 0.1% TDS + 0.5% TCS on ₹1,000 (100000 paise) = 100 + 500
    const svc = new PayoutTaxService(config(), flags(true));
    expect(await svc.compute(100_000)).toMatchObject({ tds: 100, tcs: 500, total: 600 });
  });

  it('reads rates from config rather than hardcoding them', async () => {
    const svc = new PayoutTaxService(
      config({ TDS_194O_RATE: 0.01, TCS_GST_RATE: 0.01 }),
      flags(true),
    );
    expect(await svc.compute(100_000)).toMatchObject({ tds: 1000, tcs: 1000, total: 2000 });
  });

  it('rounds up, so the platform never under-withholds', async () => {
    const svc = new PayoutTaxService(config(), flags(true));
    // 1 paisa * 0.001 = 0.001 → must not floor to 0
    expect((await svc.compute(1)).tds).toBe(1);
  });

  it('returns zero for a non-positive gross', async () => {
    const svc = new PayoutTaxService(config(), flags(true));
    expect(await svc.compute(0)).toMatchObject({ total: 0 });
  });
});
