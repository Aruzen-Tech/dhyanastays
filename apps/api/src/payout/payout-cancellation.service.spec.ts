import {
  PayoutCancellationService,
  retainedRatio,
} from './payout-cancellation.service';

/**
 * The bug this fixes: cancelling a booking left its payout line untouched, so a
 * guest could be refunded in full while the host was still paid in full.
 */

function makeTx(lines: Array<Record<string, unknown>>) {
  return {
    payoutLine: {
      findMany: jest.fn().mockResolvedValue(lines),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const ledger = () => ({ record: jest.fn().mockResolvedValue(undefined) });
const balance = () => ({ recordDebt: jest.fn().mockResolvedValue({}) });
const route = (reversed: number | null = 0) => ({
  reverseLine: jest.fn().mockResolvedValue(reversed === null ? null : { reversed }),
});

const build = (
  bal = balance(),
  rt = route(),
) => ({
  svc: new PayoutCancellationService(
    {} as never,
    audit() as never,
    ledger() as never,
    bal as never,
    rt as never,
  ),
  balance: bal,
  route: rt,
});

/** ₹11,000 accommodation → the host's 90% share is the whole line here. */
const line = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  hostId: 'h1',
  bookingId: 'b1',
  amount: 1_100_000,
  reversedAmount: 0,
  status: 'NOT_ELIGIBLE',
  transferId: null,
  transferAmount: null,
  ...over,
});

const ARGS = {
  bookingId: 'b1',
  accommodationTotal: 1_100_000,
  accommodationRefund: 1_100_000, // full refund
  actorId: 'admin1',
};

describe('retainedRatio', () => {
  it('maps each refund tier to the share the platform kept', () => {
    expect(retainedRatio(1000, 1000)).toBe(0); // 100% refund → host gets nothing
    expect(retainedRatio(1000, 500)).toBe(0.5); // 50% refund → half
    expect(retainedRatio(1000, 0)).toBe(1); // 0% refund → host keeps their share
  });

  it('clamps nonsense inputs instead of producing a negative share', () => {
    expect(retainedRatio(1000, 5000)).toBe(0);
    expect(retainedRatio(1000, -100)).toBe(1);
  });

  it('cannot apportion a zero total, so a refund voids and none leaves alone', () => {
    expect(retainedRatio(0, 100)).toBe(0);
    expect(retainedRatio(0, 0)).toBe(1);
  });
});

describe('a full refund before any money moved', () => {
  it('voids the line so no rail can pick it up', async () => {
    const tx = makeTx([line()]);
    const { svc } = build();

    const res = await svc.adjustForCancellation(tx as never, ARGS);

    expect(res.voided).toBe(1);
    expect(tx.payoutLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'l1' },
        data: expect.objectContaining({ amount: 0, status: 'REVERSED' }),
      }),
    );
  });
});

describe('a partial refund', () => {
  it('reduces the host share in proportion to what was kept', async () => {
    const tx = makeTx([line()]);
    const { svc } = build();

    // 50% refunded → the host keeps half.
    const res = await svc.adjustForCancellation(tx as never, {
      ...ARGS,
      accommodationRefund: 550_000,
    });

    expect(res.reduced).toBe(1);
    expect(res.voided).toBe(0);
    const data = tx.payoutLine.update.mock.calls[0][0].data;
    expect(data.amount).toBe(550_000);
    // Still payable, so it must NOT be parked.
    expect(data.status).toBeUndefined();
  });
});

describe('a 0% refund (cancelled too late — the guest forfeits)', () => {
  it('leaves the host share completely alone', async () => {
    const tx = makeTx([line()]);
    const { svc } = build();

    const res = await svc.adjustForCancellation(tx as never, {
      ...ARGS,
      accommodationRefund: 0,
    });

    expect(res).toMatchObject({ voided: 0, reduced: 0, debtRecorded: 0 });
    expect(tx.payoutLine.update).not.toHaveBeenCalled();
    expect(res.reversals).toHaveLength(0);
  });
});

describe('when the money has already been transferred', () => {
  it('queues a reversal rather than editing the line', async () => {
    const tx = makeTx([
      line({ transferId: 'trf_1', status: 'SCHEDULED', transferAmount: 1_093_400 }),
    ]);
    const { svc } = build();

    const res = await svc.adjustForCancellation(tx as never, ARGS);

    // The transfer record is the truth once money is committed at the PA.
    expect(tx.payoutLine.update).not.toHaveBeenCalled();
    expect(res.reversals).toEqual([
      expect.objectContaining({ lineId: 'l1', transferId: 'trf_1', amount: 1_100_000 }),
    ]);
  });

  it('records host debt when the manual rail already paid it', async () => {
    const tx = makeTx([line({ status: 'PAID' })]);
    const { svc, balance: bal } = build();

    const res = await svc.adjustForCancellation(tx as never, ARGS);

    // Nothing to reverse on the manual rail — it becomes debt to net off.
    expect(res.debtRecorded).toBe(1_100_000);
    expect(bal.recordDebt).toHaveBeenCalledWith(
      'h1',
      1_100_000,
      'Booking cancelled after payout',
      expect.objectContaining({ bookingId: 'b1', payoutLineId: 'l1', tx }),
    );
  });
});

describe('idempotency and edge cases', () => {
  it('does nothing to a line already fully reversed', async () => {
    const tx = makeTx([line({ status: 'REVERSED', reversedAmount: 1_100_000 })]);
    const { svc } = build();

    const res = await svc.adjustForCancellation(tx as never, ARGS);

    expect(res).toMatchObject({ voided: 0, reduced: 0, debtRecorded: 0 });
    expect(tx.payoutLine.update).not.toHaveBeenCalled();
  });

  it('only claws back what has not already been reversed', async () => {
    const tx = makeTx([
      line({ transferId: 'trf_1', status: 'PAID', reversedAmount: 400_000 }),
    ]);
    const { svc } = build();

    const res = await svc.adjustForCancellation(tx as never, ARGS);

    // 1,100,000 owed back minus the 400,000 already taken.
    expect(res.reversals[0].amount).toBe(700_000);
  });

  it('handles a deposit booking’s two lines independently', async () => {
    const tx = makeTx([
      line({ id: 'l1', amount: 550_000 }),
      line({ id: 'l2', amount: 550_000, status: 'PAID' }),
    ]);
    const { svc, balance: bal } = build();

    const res = await svc.adjustForCancellation(tx as never, ARGS);

    expect(res.voided).toBe(1); // the un-paid one is voided
    expect(res.debtRecorded).toBe(550_000); // the paid one becomes debt
    expect(bal.recordDebt).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the booking had no payout line', async () => {
    const tx = makeTx([]);
    const { svc } = build();
    expect(await svc.adjustForCancellation(tx as never, ARGS)).toMatchObject({
      voided: 0,
      reversals: [],
    });
  });
});

describe('settleReversals', () => {
  const pending = [
    { lineId: 'l1', transferId: 'trf_1', hostId: 'h1', bookingId: 'b1', amount: 500 },
  ];

  it('reverses through the Route service', async () => {
    const { svc, route: rt } = build(balance(), route(500));
    await svc.settleReversals(pending);
    expect(rt.reverseLine).toHaveBeenCalledWith('l1', 500, 'booking_cancelled');
  });

  it('falls back to host debt when the reversal fails', async () => {
    const rt = route();
    rt.reverseLine.mockRejectedValue(new Error('gateway down'));
    const { svc, balance: bal } = build(balance(), rt);

    // A gateway failure must not lose the money, nor undo the cancellation.
    await expect(svc.settleReversals(pending)).resolves.toBeUndefined();
    expect(bal.recordDebt).toHaveBeenCalledWith(
      'h1',
      500,
      'Booking cancelled — reversal failed',
      expect.objectContaining({ bookingId: 'b1', payoutLineId: 'l1' }),
    );
  });

  it('falls back to host debt when there is no transfer to reverse', async () => {
    const { svc, balance: bal } = build(balance(), route(null));
    await svc.settleReversals(pending);
    expect(bal.recordDebt).toHaveBeenCalled();
  });
});
