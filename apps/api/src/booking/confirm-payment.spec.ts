import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingService } from './booking.service';
import {
  AmountMismatchException,
  TamperedSnapshotException,
} from './confirm-payment.exceptions';

/**
 * Targeted unit tests for the seven-step confirmPayment (Step 6 of the
 * production-correctness pass). confirmPayment is now a tx-scoped helper:
 * it takes the caller's tx and runs steps 1-7 inline (no nested transaction).
 *
 * Covers:
 *   - Step 2: idempotent replay on already-confirmed bookings (didConfirm=false)
 *   - Step 3: tampered HMAC → TamperedSnapshotException
 *   - Step 4: amount mismatch → AmountMismatchException
 *   - Step 5: overlap conflict → ConflictException
 *   - Step 6: state-machine routed event
 *   - Step 7: ledger entry written
 *   - Step 7c: cancellation policy snapshot written once
 *
 * The real-Postgres concurrency proof + SERIALIZABLE behaviour live in the
 * integration suite (test/integration/booking-engine.int-spec.ts).
 */

const FULL_SNAPSHOT = {
  listingId: 'listing-1',
  total: 1700000,
  depositAmount: 850000,
  balanceAmount: 850000,
  subtotal: 1500000,
  cleaningFee: 100000,
  platformFee: 150000,
  gstAmount: 27000,
  hmac: 'goodhmac',
};

function makeBooking(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'booking-1',
    listingId: 'listing-1',
    guestId: 'guest-1',
    holdId: 'hold-1',
    status: 'PAYMENT_PENDING',
    plan: 'FULL',
    startsAt: new Date('2026-12-01'),
    endsAt: new Date('2026-12-04'),
    priceSnapshot: FULL_SNAPSHOT,
    payLaterMonths: null,
    statusHistory: [],
    cancellationPolicySnapshot: null,
    ...over,
  };
}

function makeTx(booking: Record<string, unknown>) {
  const updateCalls: Array<Record<string, unknown>> = [];
  return {
    updateCalls,
    tx: {
      $queryRaw: jest.fn().mockImplementation(async (strings: TemplateStringsArray) => {
        const sql = strings.join('');
        if (sql.includes('FOR UPDATE')) return [];
        return []; // overlap check — empty
      }),
      booking: {
        findUnique: jest.fn().mockResolvedValue(booking),
        update: jest.fn().mockImplementation(async (args: Record<string, unknown>) => {
          updateCalls.push(args);
          return { ...booking, ...((args.data as object) ?? {}) };
        }),
      },
      listing: { findUnique: jest.fn().mockResolvedValue({ hostId: 'host-1' }) },
      payoutLine: { create: jest.fn().mockResolvedValue({}) },
    },
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  const stateMachineMock = {
    transition: jest.fn().mockImplementation(async (_tx, b) => ({
      ...b,
      status: 'CONFIRMED_PAID',
    })),
  };
  const signerMock = {
    verify: jest.fn().mockReturnValue(true),
    sign: jest.fn().mockReturnValue('sig'),
  };
  const ledgerMock = { record: jest.fn().mockResolvedValue(undefined) };

  return {
    service: new BookingService(
      { booking: { findUnique: jest.fn() } } as never, // prisma (unused in confirmPayment)
      {} as never, // pricing
      { log: jest.fn().mockResolvedValue(undefined) } as never, // audit
      ledgerMock as never,
      { sendBookingConfirmed: jest.fn() } as never,
      { enqueue: jest.fn() } as never,
      { onReferredUserFirstBooking: jest.fn() } as never,
      {
        createBookingAddOns: jest.fn(),
        cancelBookingAddOns: jest.fn().mockResolvedValue(0),
      } as never,
      { awardPoints: jest.fn(), pointsForPaise: jest.fn().mockReturnValue(0) } as never,
      {
        createPlanFromFirstCapture: jest.fn().mockResolvedValue(undefined),
        cancelPlan: jest.fn(),
      } as never,
      (overrides.stateMachine ?? stateMachineMock) as never,
      (overrides.signer ?? signerMock) as never,
    ),
    stateMachineMock,
    signerMock,
    ledgerMock,
  };
}

describe('BookingService.confirmPayment — seven-step contract (tx-scoped)', () => {
  describe('Step 2: idempotent replay', () => {
    it('returns didConfirm=false on CONFIRMED_PAID — no side effects', async () => {
      const { tx } = makeTx(makeBooking({ status: 'CONFIRMED_PAID' }));
      const { service, stateMachineMock, ledgerMock } = makeService();

      const result = await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000);
      expect(result.didConfirm).toBe(false);
      expect(result.booking.status).toBe('CONFIRMED_PAID');
      expect(stateMachineMock.transition).not.toHaveBeenCalled();
      expect(ledgerMock.record).not.toHaveBeenCalled();
    });

    it('returns didConfirm=false on CONFIRMED_DEPOSIT', async () => {
      const { tx } = makeTx(makeBooking({ status: 'CONFIRMED_DEPOSIT' }));
      const { service, stateMachineMock } = makeService();

      const result = await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 850000);
      expect(result.didConfirm).toBe(false);
      expect(stateMachineMock.transition).not.toHaveBeenCalled();
    });

    it('throws ConflictException when booking is CANCELLED', async () => {
      const { tx } = makeTx(makeBooking({ status: 'CANCELLED' }));
      const { service } = makeService();
      await expect(
        service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when booking is missing', async () => {
      const { tx } = makeTx(makeBooking());
      (tx.booking.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const { service } = makeService();
      await expect(
        service.confirmPayment(tx as never, 'booking-X', 'pay-1', 1700000),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('Step 3: tampered snapshot detection', () => {
    it('throws TamperedSnapshotException when signer.verify returns false', async () => {
      const { tx } = makeTx(makeBooking());
      const { service, stateMachineMock, ledgerMock } = makeService({
        signer: { verify: jest.fn().mockReturnValue(false), sign: jest.fn() },
      });

      await expect(
        service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000),
      ).rejects.toBeInstanceOf(TamperedSnapshotException);
      expect(stateMachineMock.transition).not.toHaveBeenCalled();
      expect(ledgerMock.record).not.toHaveBeenCalled();
    });

    it('skips HMAC check when snapshot has no hmac (legacy row)', async () => {
      const legacy = { ...FULL_SNAPSHOT };
      delete (legacy as Record<string, unknown>).hmac;
      const { tx } = makeTx(makeBooking({ priceSnapshot: legacy }));
      const { service, signerMock } = makeService();

      await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000);
      expect(signerMock.verify).not.toHaveBeenCalled();
    });
  });

  describe('Step 4: amount mismatch', () => {
    it('throws AmountMismatchException when capture != snapshot.total (FULL)', async () => {
      const { tx } = makeTx(makeBooking({ plan: 'FULL' }));
      const { service } = makeService();
      await expect(
        service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700001),
      ).rejects.toBeInstanceOf(AmountMismatchException);
    });

    it('accepts exact match for FULL', async () => {
      const { tx } = makeTx(makeBooking({ plan: 'FULL' }));
      const { service } = makeService();
      const result = await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000);
      expect(result.didConfirm).toBe(true);
      expect(result.booking.status).toBe('CONFIRMED_PAID');
    });

    it('expects snapshot.depositAmount for DEPOSIT_50', async () => {
      const { tx } = makeTx(makeBooking({ plan: 'DEPOSIT_50' }));
      const { service } = makeService();
      await expect(
        service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000),
      ).rejects.toBeInstanceOf(AmountMismatchException);

      const { tx: tx2 } = makeTx(makeBooking({ plan: 'DEPOSIT_50' }));
      const { service: svc2 } = makeService();
      const result = await svc2.confirmPayment(tx2 as never, 'booking-1', 'pay-1', 850000);
      expect(result.didConfirm).toBe(true);
    });
  });

  describe('Step 5: overlap conflict', () => {
    it('throws ConflictException when overlap query returns rows', async () => {
      const { tx } = makeTx(makeBooking());
      (tx.$queryRaw as jest.Mock).mockImplementation(
        async (strings: TemplateStringsArray) => {
          const sql = strings.join('');
          if (sql.includes('FOR UPDATE')) return [];
          return [{ id: 'other-booking' }];
        },
      );
      const { service, stateMachineMock } = makeService();
      await expect(
        service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(stateMachineMock.transition).not.toHaveBeenCalled();
    });
  });

  describe('Steps 6+7: state machine + ledger', () => {
    it('FULL plan routes PAYMENT_CONFIRMED_FULL through SM and writes ledger', async () => {
      const { tx } = makeTx(makeBooking({ plan: 'FULL' }));
      const { service, stateMachineMock, ledgerMock } = makeService();

      const result = await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000);
      expect(result.didConfirm).toBe(true);
      expect(stateMachineMock.transition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'booking-1', plan: 'FULL' }),
        'PAYMENT_CONFIRMED_FULL',
        expect.objectContaining({ actorId: 'system:razorpay' }),
      );
      expect(ledgerMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PAYMENT_CAPTURED',
          amount: 1700000,
          bookingId: 'booking-1',
        }),
      );
    });

    it('DEPOSIT_50 plan routes PAYMENT_CONFIRMED_DEPOSIT', async () => {
      const { tx } = makeTx(makeBooking({ plan: 'DEPOSIT_50' }));
      const { service, stateMachineMock } = makeService();
      await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 850000);
      expect(stateMachineMock.transition).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'PAYMENT_CONFIRMED_DEPOSIT',
        expect.anything(),
      );
    });
  });

  describe('Step 7c: cancellation policy snapshot', () => {
    it('writes cancellationPolicySnapshot on the first confirm', async () => {
      const { tx, updateCalls } = makeTx(makeBooking({ cancellationPolicySnapshot: null }));
      const { service } = makeService();
      await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000);

      const snapWrite = updateCalls.find(
        (c) => (c.data as Record<string, unknown>).cancellationPolicySnapshot,
      );
      expect(snapWrite).toBeDefined();
      const snap = (snapWrite!.data as Record<string, unknown>)
        .cancellationPolicySnapshot as { tiers: Array<{ refundPct: number }> };
      expect(snap.tiers.map((t) => t.refundPct)).toEqual([100, 50, 0]);
    });

    it('does NOT rewrite cancellationPolicySnapshot on re-confirm', async () => {
      const existing = {
        tiers: [{ minHoursBefore: 24, refundPct: 75 }],
        snapshotAt: '2026-01-01T00:00:00.000Z',
      };
      const { tx, updateCalls } = makeTx(makeBooking({ cancellationPolicySnapshot: existing }));
      const { service } = makeService();
      await service.confirmPayment(tx as never, 'booking-1', 'pay-1', 1700000);
      const rewrite = updateCalls.find(
        (c) => (c.data as Record<string, unknown>).cancellationPolicySnapshot,
      );
      expect(rewrite).toBeUndefined();
    });
  });
});

/**
 * settleBalance — the SECOND (balance) capture on a DEPOSIT_50 booking.
 * Mirrors the confirmPayment contract but drives BALANCE_PAID → CONFIRMED_PAID,
 * checks against snapshot.balanceAmount, and books the second payout line.
 * End-to-end money math (deposit + balance ledger/payout sums) lives in the
 * integration suite (test/integration/booking-lifecycle.int-spec.ts).
 */
describe('BookingService.settleBalance — balance-capture contract (tx-scoped)', () => {
  it('BALANCE_DUE → transitions BALANCE_PAID, writes ledger + second payout, didSettle=true', async () => {
    const { tx } = makeTx(makeBooking({ status: 'BALANCE_DUE', plan: 'DEPOSIT_50' }));
    const { service, stateMachineMock, ledgerMock } = makeService();

    const res = await service.settleBalance(tx as never, 'booking-1', 'pay-bal', 850000);

    expect(res.didSettle).toBe(true);
    expect(stateMachineMock.transition).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ id: 'booking-1' }),
      'BALANCE_PAID',
      expect.anything(),
    );
    expect(ledgerMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PAYMENT_CAPTURED', amount: 850000, bookingId: 'booking-1' }),
    );
    expect(tx.payoutLine.create).toHaveBeenCalled();
  });

  it('settles a balance paid early — directly from CONFIRMED_DEPOSIT', async () => {
    const { tx } = makeTx(makeBooking({ status: 'CONFIRMED_DEPOSIT', plan: 'DEPOSIT_50' }));
    const { service, stateMachineMock } = makeService();

    const res = await service.settleBalance(tx as never, 'booking-1', 'pay-bal', 850000);

    expect(res.didSettle).toBe(true);
    expect(stateMachineMock.transition).toHaveBeenCalledWith(
      tx,
      expect.anything(),
      'BALANCE_PAID',
      expect.anything(),
    );
  });

  it('idempotent replay: already CONFIRMED_PAID → didSettle=false, no side effects', async () => {
    const { tx } = makeTx(makeBooking({ status: 'CONFIRMED_PAID', plan: 'DEPOSIT_50' }));
    const { service, stateMachineMock, ledgerMock } = makeService();

    const res = await service.settleBalance(tx as never, 'booking-1', 'pay-bal', 850000);

    expect(res.didSettle).toBe(false);
    expect(stateMachineMock.transition).not.toHaveBeenCalled();
    expect(ledgerMock.record).not.toHaveBeenCalled();
    expect(tx.payoutLine.create).not.toHaveBeenCalled();
  });

  it('rejects a balance amount that does not equal snapshot.balanceAmount', async () => {
    const { tx } = makeTx(makeBooking({ status: 'BALANCE_DUE', plan: 'DEPOSIT_50' }));
    const { service } = makeService();

    await expect(
      service.settleBalance(tx as never, 'booking-1', 'pay-bal', 850001),
    ).rejects.toBeInstanceOf(AmountMismatchException);
  });

  it('rejects a tampered snapshot (HMAC verify fails)', async () => {
    const { tx } = makeTx(makeBooking({ status: 'BALANCE_DUE', plan: 'DEPOSIT_50' }));
    const { service } = makeService({
      signer: { verify: jest.fn().mockReturnValue(false), sign: jest.fn() },
    });

    await expect(
      service.settleBalance(tx as never, 'booking-1', 'pay-bal', 850000),
    ).rejects.toBeInstanceOf(TamperedSnapshotException);
  });

  it('rejects settling a balance from an invalid status (e.g. PAYMENT_PENDING)', async () => {
    const { tx } = makeTx(makeBooking({ status: 'PAYMENT_PENDING', plan: 'DEPOSIT_50' }));
    const { service } = makeService();

    await expect(
      service.settleBalance(tx as never, 'booking-1', 'pay-bal', 850000),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
