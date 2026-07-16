import { BookingStatus } from '@prisma/client';
import {
  BookingStateMachine,
  BookingLike,
  BookingEvent,
  GuardFailedException,
  IllegalTransitionException,
  TRANSITIONS,
} from './state-machine';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBooking(over: Partial<BookingLike> = {}): BookingLike {
  return {
    id: 'b1',
    status: 'PAYMENT_PENDING',
    plan: 'FULL',
    startsAt: new Date('2026-06-10'),
    endsAt: new Date('2026-06-12'),
    balanceDueAt: null,
    payLaterMonths: null,
    statusHistory: [],
    ...over,
  };
}

interface MockBookingRow extends BookingLike {
  updatedFields?: Record<string, unknown>;
}

function makeTxMock() {
  const calls: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];
  return {
    calls,
    tx: {
      booking: {
        update: async (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }): Promise<MockBookingRow> => {
          calls.push(args);
          return { ...makeBooking({ id: args.where.id }), updatedFields: args.data };
        },
      },
    },
  };
}

const ALL_STATUSES: BookingStatus[] = [
  'HOLD',
  'PAYMENT_PENDING',
  'CONFIRMED_DEPOSIT',
  'BALANCE_DUE',
  'CONFIRMED_PAID',
  'CANCELLED',
  'REFUNDED',
  'COMPLETED',
];

const ALL_EVENTS: BookingEvent[] = [
  'PAYMENT_CONFIRMED_FULL',
  'PAYMENT_CONFIRMED_DEPOSIT',
  'PAY_LATER_FIRST_CAPTURED',
  'PAY_LATER_INSTALMENT_CAPTURED',
  'PAY_LATER_FINAL_CAPTURED',
  'BALANCE_DUE_TRIGGERED',
  'BALANCE_PAID',
  'GUEST_CANCELLED',
  'ADMIN_CANCELLED',
  'AUTO_CANCEL_UNPAID_BALANCE',
  'AUTO_CANCEL_PAY_LATER_DEFAULT',
  'STAY_COMPLETED',
  'AUTO_COMPLETED',
  'ADMIN_FULL_REFUND_ISSUED',
];

// ─── Valid transitions — golden path per row ────────────────────────────────

describe('BookingStateMachine — valid transitions', () => {
  const sm = new BookingStateMachine();

  it('PAYMENT_PENDING → CONFIRMED_PAID on PAYMENT_CONFIRMED_FULL (plan=FULL)', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ plan: 'FULL' });
    await sm.transition(tx as never, booking, 'PAYMENT_CONFIRMED_FULL', {
      actorId: 'system:razorpay',
    });
    expect(calls[0].data.status).toBe('CONFIRMED_PAID');
  });

  it('PAYMENT_PENDING → CONFIRMED_DEPOSIT on PAYMENT_CONFIRMED_DEPOSIT (plan=DEPOSIT_50)', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ plan: 'DEPOSIT_50' });
    await sm.transition(tx as never, booking, 'PAYMENT_CONFIRMED_DEPOSIT', {
      actorId: 'system:razorpay',
    });
    expect(calls[0].data.status).toBe('CONFIRMED_DEPOSIT');
  });

  it('PAYMENT_PENDING → CONFIRMED_DEPOSIT on PAY_LATER_FIRST_CAPTURED (plan=PAY_LATER)', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ plan: 'PAY_LATER', payLaterMonths: 6 });
    await sm.transition(tx as never, booking, 'PAY_LATER_FIRST_CAPTURED', {
      actorId: 'system:razorpay',
    });
    expect(calls[0].data.status).toBe('CONFIRMED_DEPOSIT');
  });

  it('CONFIRMED_DEPOSIT → CONFIRMED_DEPOSIT on PAY_LATER_INSTALMENT_CAPTURED (self-loop)', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({
      status: 'CONFIRMED_DEPOSIT',
      plan: 'PAY_LATER',
      payLaterMonths: 6,
    });
    await sm.transition(tx as never, booking, 'PAY_LATER_INSTALMENT_CAPTURED', {
      actorId: 'system:razorpay',
    });
    expect(calls[0].data.status).toBe('CONFIRMED_DEPOSIT');
  });

  it('CONFIRMED_DEPOSIT → CONFIRMED_PAID on PAY_LATER_FINAL_CAPTURED', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({
      status: 'CONFIRMED_DEPOSIT',
      plan: 'PAY_LATER',
      payLaterMonths: 6,
    });
    await sm.transition(tx as never, booking, 'PAY_LATER_FINAL_CAPTURED', {
      actorId: 'system:razorpay',
    });
    expect(calls[0].data.status).toBe('CONFIRMED_PAID');
  });

  it('CONFIRMED_DEPOSIT → BALANCE_DUE on BALANCE_DUE_TRIGGERED', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ status: 'CONFIRMED_DEPOSIT', plan: 'DEPOSIT_50' });
    await sm.transition(tx as never, booking, 'BALANCE_DUE_TRIGGERED', {
      actorId: 'system:cron',
    });
    expect(calls[0].data.status).toBe('BALANCE_DUE');
  });

  it('BALANCE_DUE → CONFIRMED_PAID on BALANCE_PAID', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ status: 'BALANCE_DUE', plan: 'DEPOSIT_50' });
    await sm.transition(tx as never, booking, 'BALANCE_PAID', {
      actorId: 'system:razorpay',
    });
    expect(calls[0].data.status).toBe('CONFIRMED_PAID');
  });

  it('GUEST_CANCELLED with refund > 0 → REFUNDED', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ status: 'CONFIRMED_PAID' });
    await sm.transition(tx as never, booking, 'GUEST_CANCELLED', {
      actorId: 'guest-1',
      refundAmountPaise: 100000,
    });
    expect(calls[0].data.status).toBe('REFUNDED');
  });

  it('GUEST_CANCELLED with refund == 0 → CANCELLED', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ status: 'CONFIRMED_PAID' });
    await sm.transition(tx as never, booking, 'GUEST_CANCELLED', {
      actorId: 'guest-1',
      refundAmountPaise: 0,
    });
    expect(calls[0].data.status).toBe('CANCELLED');
  });

  it('STAY_COMPLETED on CONFIRMED_PAID → COMPLETED', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ status: 'CONFIRMED_PAID' });
    await sm.transition(tx as never, booking, 'STAY_COMPLETED', {
      actorId: 'admin-1',
    });
    expect(calls[0].data.status).toBe('COMPLETED');
  });

  it('AUTO_COMPLETED on CONFIRMED_DEPOSIT → COMPLETED', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ status: 'CONFIRMED_DEPOSIT' });
    await sm.transition(tx as never, booking, 'AUTO_COMPLETED', {
      actorId: 'system:auto-complete',
    });
    expect(calls[0].data.status).toBe('COMPLETED');
  });

  it('appends a StatusHistoryEntry with actor + ISO timestamp + metadata', async () => {
    const { tx, calls } = makeTxMock();
    const booking = makeBooking({ plan: 'FULL', statusHistory: [] });
    await sm.transition(tx as never, booking, 'PAYMENT_CONFIRMED_FULL', {
      actorId: 'system:razorpay',
      metadata: { paymentId: 'pay_x' },
    });
    const history = calls[0].data.statusHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      from: 'PAYMENT_PENDING',
      to: 'CONFIRMED_PAID',
      event: 'PAYMENT_CONFIRMED_FULL',
      actorId: 'system:razorpay',
      metadata: { paymentId: 'pay_x' },
    });
    expect(typeof history[0].at).toBe('string');
    expect(() => new Date(history[0].at as string).toISOString()).not.toThrow();
  });

  it('preserves prior statusHistory entries on subsequent transitions', async () => {
    const { tx, calls } = makeTxMock();
    const prior = [
      {
        from: 'PAYMENT_PENDING',
        to: 'CONFIRMED_DEPOSIT',
        event: 'PAYMENT_CONFIRMED_DEPOSIT',
        actorId: 'system:razorpay',
        at: '2026-06-01T10:00:00.000Z',
      },
    ];
    const booking = makeBooking({
      status: 'CONFIRMED_DEPOSIT',
      plan: 'DEPOSIT_50',
      statusHistory: prior,
    });
    await sm.transition(tx as never, booking, 'BALANCE_DUE_TRIGGERED', {
      actorId: 'system:cron',
    });
    const history = calls[0].data.statusHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject(prior[0]);
    expect(history[1].event).toBe('BALANCE_DUE_TRIGGERED');
  });
});

// ─── Guard failures ─────────────────────────────────────────────────────────

describe('BookingStateMachine — guard failures', () => {
  const sm = new BookingStateMachine();

  it('PAYMENT_CONFIRMED_FULL fails if plan != FULL', async () => {
    const { tx } = makeTxMock();
    const booking = makeBooking({ plan: 'DEPOSIT_50' });
    await expect(
      sm.transition(tx as never, booking, 'PAYMENT_CONFIRMED_FULL', {
        actorId: 'system:razorpay',
      }),
    ).rejects.toBeInstanceOf(GuardFailedException);
  });

  it('PAYMENT_CONFIRMED_DEPOSIT fails if plan != DEPOSIT_50', async () => {
    const { tx } = makeTxMock();
    const booking = makeBooking({ plan: 'FULL' });
    await expect(
      sm.transition(tx as never, booking, 'PAYMENT_CONFIRMED_DEPOSIT', {
        actorId: 'system:razorpay',
      }),
    ).rejects.toBeInstanceOf(GuardFailedException);
  });

  it('PAY_LATER_FIRST_CAPTURED fails if plan != PAY_LATER', async () => {
    const { tx } = makeTxMock();
    const booking = makeBooking({ plan: 'FULL' });
    await expect(
      sm.transition(tx as never, booking, 'PAY_LATER_FIRST_CAPTURED', {
        actorId: 'system:razorpay',
      }),
    ).rejects.toBeInstanceOf(GuardFailedException);
  });
});

// ─── Illegal transitions — full coverage ────────────────────────────────────

describe('BookingStateMachine — illegal transitions', () => {
  const sm = new BookingStateMachine();

  // Build the set of (from, event) pairs that ARE legal (ignoring guards).
  const legalPairs = new Set<string>();
  for (const t of TRANSITIONS) {
    for (const from of t.from) legalPairs.add(`${from}:${t.event}`);
  }

  // For every (status × event) pair NOT in `legalPairs`, the machine must throw
  // IllegalTransitionException — independent of guards.
  for (const status of ALL_STATUSES) {
    for (const event of ALL_EVENTS) {
      if (legalPairs.has(`${status}:${event}`)) continue;
      it(`rejects ${event} from ${status} as IllegalTransitionException`, async () => {
        const { tx } = makeTxMock();
        const booking = makeBooking({ status, plan: 'FULL' });
        await expect(
          sm.transition(tx as never, booking, event, { actorId: 'test' }),
        ).rejects.toBeInstanceOf(IllegalTransitionException);
      });
    }
  }

  // Per-(status × event) coverage above already proves terminal-state behaviour;
  // REFUNDED is fully terminal, CANCELLED and COMPLETED accept ADMIN_FULL_REFUND_ISSUED.
  it('REFUNDED is fully terminal — every event rejected', async () => {
    const { tx } = makeTxMock();
    const booking = makeBooking({ status: 'REFUNDED' });
    for (const event of ALL_EVENTS) {
      await expect(
        sm.transition(tx as never, booking, event, { actorId: 'test' }),
      ).rejects.toBeInstanceOf(IllegalTransitionException);
    }
  });
});

// ─── ADMIN_FULL_REFUND_ISSUED — admin partial-refund engine ─────────────────

describe('BookingStateMachine — ADMIN_FULL_REFUND_ISSUED', () => {
  const sm = new BookingStateMachine();

  it.each(['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'COMPLETED', 'CANCELLED'] as const)(
    'allows ADMIN_FULL_REFUND_ISSUED from %s → REFUNDED',
    async (from) => {
      const { tx, calls } = makeTxMock();
      const booking = makeBooking({ status: from });
      await sm.transition(tx as never, booking, 'ADMIN_FULL_REFUND_ISSUED', {
        actorId: 'admin-1',
        metadata: { totalRefundedPaise: 100000 },
      });
      expect(calls[0].data.status).toBe('REFUNDED');
    },
  );

  it('rejects ADMIN_FULL_REFUND_ISSUED from PAYMENT_PENDING (nothing captured yet)', async () => {
    const { tx } = makeTxMock();
    const booking = makeBooking({ status: 'PAYMENT_PENDING' });
    await expect(
      sm.transition(tx as never, booking, 'ADMIN_FULL_REFUND_ISSUED', { actorId: 'admin-1' }),
    ).rejects.toBeInstanceOf(IllegalTransitionException);
  });
});

// ─── readHistory helper ─────────────────────────────────────────────────────

describe('BookingStateMachine.readHistory', () => {
  it('returns [] for null statusHistory', () => {
    expect(BookingStateMachine.readHistory({ statusHistory: null })).toEqual([]);
  });
  it('returns [] for non-array statusHistory', () => {
    expect(BookingStateMachine.readHistory({ statusHistory: { foo: 1 } as never })).toEqual([]);
  });
  it('returns entries when statusHistory is a populated array', () => {
    const entries = [
      {
        from: 'PAYMENT_PENDING' as BookingStatus,
        to: 'CONFIRMED_PAID' as BookingStatus,
        event: 'PAYMENT_CONFIRMED_FULL' as BookingEvent,
        actorId: 'system:razorpay',
        at: '2026-06-01T00:00:00.000Z',
      },
    ];
    expect(
      BookingStateMachine.readHistory({ statusHistory: entries as never }),
    ).toEqual(entries);
  });
});
