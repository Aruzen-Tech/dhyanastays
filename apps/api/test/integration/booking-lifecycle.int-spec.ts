/**
 * Booking-engine full-lifecycle suite — drives the REAL services end-to-end
 * against the real dev Postgres. This is the top-standard behavioural proof:
 * quote → hold → booking → payment/webhook → confirm → balance → cancel/refund
 * → complete, plus money correctness, idempotency, and the cron transitions.
 *
 * Only external adapters are stubbed (Notification no-op, Razorpay stub mode);
 * every state transition, ledger write, and payout line is produced by the
 * actual production code paths the HTTP controllers call.
 *
 * Run: pnpm --filter @dhyana/api test:int
 */
import { randomUUID } from 'crypto';
import {
  prisma,
  setupFixtures,
  teardownFixtures,
  Fixtures,
} from './harness';
import { makeEngine, capturedEvent, EngineServices } from './services-harness';

jest.setTimeout(120000);

let fx: Fixtures;
let eng: EngineServices;

// Distinct, non-overlapping date window per test (overlap trigger blocks reuse).
let dayCursor = 0;
function nextWindow(nights = 3): { startsAt: Date; endsAt: Date } {
  const base = new Date(Date.UTC(2032, 0, 1));
  const s = new Date(base.getTime() + dayCursor * 864e5);
  dayCursor += nights + 2;
  return { startsAt: s, endsAt: new Date(s.getTime() + nights * 864e5) };
}

// checkIn a given number of hours from now (for cancellation-tier tests),
// with a unique far-apart window so ranges never overlap.
function windowHoursFromNow(hours: number): { startsAt: Date; endsAt: Date } {
  const s = new Date(Date.now() + hours * 3600_000);
  return { startsAt: s, endsAt: new Date(s.getTime() + 3 * 864e5) };
}

async function quote(startsAt: Date, endsAt: Date) {
  return eng.pricing.quote({
    listingId: fx.listingId,
    checkIn: startsAt.toISOString(),
    checkOut: endsAt.toISOString(),
    guests: 2,
    userId: fx.guestUserId,
  });
}

async function holdAndBook(
  plan: 'FULL' | 'DEPOSIT_50' | 'PAY_LATER',
  win: { startsAt: Date; endsAt: Date },
  payLaterMonths?: 3 | 6 | 12,
): Promise<string> {
  const hold = await eng.hold.createHold(fx.guestUserId, {
    listingId: fx.listingId,
    checkIn: win.startsAt.toISOString(),
    checkOut: win.endsAt.toISOString(),
    guests: 2,
    idempotencyKey: randomUUID(),
  });
  const booking = await eng.booking.createBooking(fx.guestUserId, {
    holdId: hold.id,
    plan: plan as never,
    payLaterMonths,
    idempotencyKey: randomUUID(),
    guestDetails: { fullName: 'Lifecycle Guest', phone: '+919876543210' } as never,
    acceptedTermsAt: new Date().toISOString(),
  });
  return booking.id;
}

// initPayment returns a union (new-order object vs existing Payment row);
// normalize to { paymentId, amount, orderRef }.
async function initPay(
  bookingId: string,
  type: 'FULL' | 'DEPOSIT' | 'BALANCE',
  idempotencyKey = randomUUID(),
) {
  const res = (await eng.payment.initPayment(fx.guestUserId, {
    bookingId,
    type: type as never,
    idempotencyKey,
  })) as { paymentId?: string; id?: string; amount: number };
  const paymentId = (res.paymentId ?? res.id)!;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  return { paymentId, amount: res.amount, orderRef: payment!.gatewayOrderRef! };
}

/** initPayment (FULL/DEPOSIT/BALANCE) then deliver a matching capture webhook. */
async function payAndCapture(
  bookingId: string,
  type: 'FULL' | 'DEPOSIT' | 'BALANCE',
  opts: { eventId?: string } = {},
) {
  const { paymentId, amount, orderRef } = await initPay(bookingId, type);
  await eng.payment.handleWebhook(
    capturedEvent(orderRef, amount),
    'stub-sig',
    opts.eventId ?? `evt_${randomUUID()}`,
  );
  return { paymentId, amountPaise: amount, orderRef };
}

async function getBooking(id: string) {
  return prisma.booking.findUnique({ where: { id } });
}
async function ledgerFor(bookingId: string) {
  return prisma.ledgerEvent.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } });
}
async function payoutsFor(bookingId: string) {
  return prisma.payoutLine.findMany({ where: { bookingId }, orderBy: { amount: 'asc' } });
}

beforeAll(async () => {
  fx = await setupFixtures();
  eng = makeEngine(prisma);
});
afterAll(async () => {
  await teardownFixtures();
  await prisma.$disconnect();
});

// ── Quote / pricing correctness ────────────────────────────────────────────

describe('Quote: paise, GST, HMAC, TTL', () => {
  it('prices a 3-night stay in paise with 10% platform fee + 18% GST and a signed, TTL-bounded snapshot', async () => {
    const win = nextWindow();
    const q = await quote(win.startsAt, win.endsAt);
    expect(q.subtotal).toBe(1500000); // 3 × ₹5,000
    expect(q.cleaningFee).toBe(100000);
    expect(q.platformFee).toBe(160000); // 10% of ₹16,000
    expect(q.gstAmount).toBe(28800); // 18% of platform fee
    expect(q.total).toBe(1788800);
    expect(q.depositAmount).toBe(894400);
    expect(q.balanceAmount).toBe(894400);
    expect(typeof q.hmac).toBe('string');
    // signer round-trips
    const { hmac, ...rest } = q as never as Record<string, unknown> & { hmac: string };
    expect(eng.signer.verify(rest, hmac)).toBe(true);
    // 30-min TTL
    expect(new Date(q.expiresAt).getTime()).toBeGreaterThan(Date.now() + 25 * 60000);
  });
});

// ── FULL lifecycle ──────────────────────────────────────────────────────────

describe('FULL plan lifecycle', () => {
  it('hold → booking(PAYMENT_PENDING) → capture → CONFIRMED_PAID, ledger + payout + policy snapshot', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('FULL', win);

    let b = await getBooking(bookingId);
    expect(b!.status).toBe('PAYMENT_PENDING');

    await payAndCapture(bookingId, 'FULL');

    b = await getBooking(bookingId);
    expect(b!.status).toBe('CONFIRMED_PAID');

    // statusHistory: exactly one transition to CONFIRMED_PAID
    const history = b!.statusHistory as Array<{ to: string; event: string }>;
    expect(history.map((h) => h.to)).toEqual(['CONFIRMED_PAID']);
    expect(history[0].event).toBe('PAYMENT_CONFIRMED_FULL');

    // Ledger: one PAYMENT_CAPTURED for the full amount (paise)
    const ledger = await ledgerFor(bookingId);
    const captures = ledger.filter((l) => l.type === 'PAYMENT_CAPTURED');
    expect(captures).toHaveLength(1);
    expect(captures[0].amount).toBe(1788800);

    // Payout: host gets subtotal + cleaning = ₹16,000 (100% captured)
    const payouts = await payoutsFor(bookingId);
    expect(payouts).toHaveLength(1);
    expect(payouts[0].amount).toBe(1600000);

    // Cancellation policy frozen at confirm
    const snap = b!.cancellationPolicySnapshot as { tiers: Array<{ refundPct: number }> };
    expect(snap.tiers.map((t) => t.refundPct)).toEqual([100, 50, 0]);
  });
});

// ── DEPOSIT_50 lifecycle (deposit → balance) ────────────────────────────────

describe('DEPOSIT_50 plan lifecycle', () => {
  it('deposit → CONFIRMED_DEPOSIT → balance-due cron → balance paid → CONFIRMED_PAID', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('DEPOSIT_50', win);

    // Deposit capture
    await payAndCapture(bookingId, 'DEPOSIT');
    let b = await getBooking(bookingId);
    expect(b!.status).toBe('CONFIRMED_DEPOSIT');

    // Force balance-due window into the past, run the cron
    await prisma.booking.update({
      where: { id: bookingId },
      data: { balanceDueAt: new Date(Date.now() - 1000) },
    });
    await eng.booking.transitionToBalanceDue();
    b = await getBooking(bookingId);
    expect(b!.status).toBe('BALANCE_DUE');

    // Pay the balance
    await payAndCapture(bookingId, 'BALANCE');
    b = await getBooking(bookingId);
    expect(b!.status).toBe('CONFIRMED_PAID');

    // Two capture ledger entries (deposit + balance) summing to the total
    const captures = (await ledgerFor(bookingId)).filter((l) => l.type === 'PAYMENT_CAPTURED');
    expect(captures).toHaveLength(2);
    expect(captures.reduce((s, l) => s + l.amount, 0)).toBe(1788800);

    // Two payout lines summing to accommodation (₹16,000)
    const payouts = await payoutsFor(bookingId);
    expect(payouts).toHaveLength(2);
    expect(payouts.reduce((s, p) => s + p.amount, 0)).toBe(1600000);
  });
});

// ── PAY_LATER first capture ─────────────────────────────────────────────────

describe('PAY_LATER first capture', () => {
  it('first instalment capture → CONFIRMED_DEPOSIT + PayLaterPlan created', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('PAY_LATER', win, 3);

    // For a PAY_LATER booking, initPayment charges the first (booking-time)
    // instalment regardless of the dto.type it's called with; the webhook
    // capture then confirms it (PAY_LATER_FIRST_CAPTURED) and activates the plan.
    await payAndCapture(bookingId, 'FULL');

    const b = await getBooking(bookingId);
    // First capture activates the plan and confirms the deposit portion.
    expect(b!.status).toBe('CONFIRMED_DEPOSIT');
    const plan = await prisma.payLaterPlan.findUnique({ where: { bookingId } });
    expect(plan).not.toBeNull();
    expect(plan!.months).toBe(3);
    // The seq-1 instalment is recorded as paid at booking time.
    const first = await prisma.payLaterInstalment.findFirst({
      where: { planId: plan!.id, seq: 1 },
    });
    expect(first!.paidAt).not.toBeNull();
  });
});

// ── Cancellation / refund tiers ─────────────────────────────────────────────

describe('Cancellation refund tiers (from frozen policy snapshot)', () => {
  async function fullyPaid(hours: number): Promise<string> {
    const win = windowHoursFromNow(hours);
    const bookingId = await holdAndBook('FULL', win);
    await payAndCapture(bookingId, 'FULL');
    return bookingId;
  }

  it('≥48h before check-in → 100% refund → REFUNDED with REFUND_ISSUED ledger', async () => {
    const bookingId = await fullyPaid(72);
    const updated = await eng.booking.cancelBooking(bookingId, fx.guestUserId, 'GUEST', {
      reason: 'plans changed',
    });
    expect(updated.status).toBe('REFUNDED');
    const refunds = await prisma.refund.findMany({ where: { bookingId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(1788800); // 100%
    const refundLedger = (await ledgerFor(bookingId)).filter((l) => l.type === 'REFUND_ISSUED');
    expect(refundLedger).toHaveLength(1);
    expect(refundLedger[0].amount).toBe(1788800);
  });

  it('10–48h before check-in → 50% refund', async () => {
    const bookingId = await fullyPaid(24);
    const updated = await eng.booking.cancelBooking(bookingId, fx.guestUserId, 'GUEST', {});
    expect(updated.status).toBe('REFUNDED');
    const refunds = await prisma.refund.findMany({ where: { bookingId } });
    expect(refunds[0].amount).toBe(894400); // 50%
  });

  it('<10h before check-in → 0% refund → CANCELLED, no refund row', async () => {
    const bookingId = await fullyPaid(5);
    const updated = await eng.booking.cancelBooking(bookingId, fx.guestUserId, 'GUEST', {});
    expect(updated.status).toBe('CANCELLED');
    const refunds = await prisma.refund.findMany({ where: { bookingId } });
    expect(refunds).toHaveLength(0);
  });
});

// ── Webhook idempotency & guards ────────────────────────────────────────────

describe('Webhook replay + guards', () => {
  it('replaying the same capture webhook 3× → confirmed once, one ledger entry, one transition, one dedup row', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('FULL', win);
    const init = await initPay(bookingId, 'FULL');
    const orderRef = init.orderRef;
    const eventId = `evt_replay_${randomUUID()}`;
    const raw = capturedEvent(orderRef, init.amount);

    await eng.payment.handleWebhook(raw, 'sig', eventId);
    await eng.payment.handleWebhook(raw, 'sig', eventId); // dedup by event id
    await eng.payment.handleWebhook(raw, 'sig', eventId);

    const b = await getBooking(bookingId);
    expect(b!.status).toBe('CONFIRMED_PAID');
    const history = b!.statusHistory as unknown[];
    expect(history).toHaveLength(1);
    const captures = (await ledgerFor(bookingId)).filter((l) => l.type === 'PAYMENT_CAPTURED');
    expect(captures).toHaveLength(1);
    const dedup = await prisma.processedRazorpayEvent.findUnique({ where: { eventId } });
    expect(dedup).not.toBeNull();
  });

  it('capture with a mismatched amount → booking stays PAYMENT_PENDING, no ledger entry', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('FULL', win);
    const init = await initPay(bookingId, 'FULL');
    const orderRef = init.orderRef;

    await expect(
      eng.payment.handleWebhook(
        capturedEvent(orderRef, init.amount + 100 /* off by ₹1 */),
        'sig',
        `evt_${randomUUID()}`,
      ),
    ).rejects.toBeTruthy();

    const b = await getBooking(bookingId);
    expect(b!.status).toBe('PAYMENT_PENDING');
    const captures = (await ledgerFor(bookingId)).filter((l) => l.type === 'PAYMENT_CAPTURED');
    expect(captures).toHaveLength(0);
  });

  it('capture with a tampered price snapshot → rejected, booking stays PAYMENT_PENDING', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('FULL', win);
    const init = await initPay(bookingId, 'FULL');
    const orderRef = init.orderRef;

    // Rogue write: change the stored snapshot total but keep the old hmac.
    const b0 = await getBooking(bookingId);
    const snap = b0!.priceSnapshot as Record<string, unknown>;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { priceSnapshot: { ...snap, total: 1 } as never },
    });

    await expect(
      eng.payment.handleWebhook(
        capturedEvent(orderRef, init.amount),
        'sig',
        `evt_${randomUUID()}`,
      ),
    ).rejects.toBeTruthy();

    const b = await getBooking(bookingId);
    expect(b!.status).toBe('PAYMENT_PENDING');
  });
});

// ── Idempotency keys (hold / booking / payment) ─────────────────────────────

describe('Idempotency keys', () => {
  it('same hold idempotencyKey → same hold row', async () => {
    const win = nextWindow();
    const key = randomUUID();
    const h1 = await eng.hold.createHold(fx.guestUserId, {
      listingId: fx.listingId, checkIn: win.startsAt.toISOString(),
      checkOut: win.endsAt.toISOString(), guests: 2, idempotencyKey: key,
    });
    const h2 = await eng.hold.createHold(fx.guestUserId, {
      listingId: fx.listingId, checkIn: win.startsAt.toISOString(),
      checkOut: win.endsAt.toISOString(), guests: 2, idempotencyKey: key,
    });
    expect(h2.id).toBe(h1.id);
  });

  it('same holdId → same booking row (one booking per hold)', async () => {
    const win = nextWindow();
    const hold = await eng.hold.createHold(fx.guestUserId, {
      listingId: fx.listingId, checkIn: win.startsAt.toISOString(),
      checkOut: win.endsAt.toISOString(), guests: 2, idempotencyKey: randomUUID(),
    });
    const body = {
      holdId: hold.id, plan: 'FULL' as never, idempotencyKey: randomUUID(),
      guestDetails: { fullName: 'X', phone: '+919876543210' } as never,
      acceptedTermsAt: new Date().toISOString(),
    };
    const b1 = await eng.booking.createBooking(fx.guestUserId, body);
    const b2 = await eng.booking.createBooking(fx.guestUserId, { ...body, idempotencyKey: randomUUID() });
    expect(b2.id).toBe(b1.id);
  });

  it('same payment idempotencyKey → same payment order', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('FULL', win);
    const key = randomUUID();
    const p1 = await initPay(bookingId, 'FULL', key);
    const p2 = await initPay(bookingId, 'FULL', key);
    expect(p2.paymentId).toBe(p1.paymentId);
  });
});

// ── Cron transitions ────────────────────────────────────────────────────────

describe('Cron lifecycle transitions', () => {
  it('autoCancelUnpaidBalance: BALANCE_DUE past the grace window → cancelled/refunded', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('DEPOSIT_50', win);
    await payAndCapture(bookingId, 'DEPOSIT');
    // Balance due 25h ago (past the 24h grace)
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'BALANCE_DUE', balanceDueAt: new Date(Date.now() - 25 * 3600_000) },
    });
    const n = await eng.booking.autoCancelUnpaidBalance();
    expect(n).toBeGreaterThanOrEqual(1);
    const b = await getBooking(bookingId);
    expect(['CANCELLED', 'REFUNDED']).toContain(b!.status);
  });

  it('autoCompleteCheckedOut: stay ended 25h ago → COMPLETED', async () => {
    const bookingId = await holdAndBook('FULL', windowHoursFromNow(-100));
    await payAndCapture(bookingId, 'FULL');
    // Force endsAt to 25h ago
    await prisma.booking.update({
      where: { id: bookingId },
      data: { endsAt: new Date(Date.now() - 25 * 3600_000) },
    });
    const n = await eng.booking.autoCompleteCheckedOut();
    expect(n).toBeGreaterThanOrEqual(1);
    const b = await getBooking(bookingId);
    expect(b!.status).toBe('COMPLETED');
  });
});

// ── Negative: overlap + expired hold ────────────────────────────────────────

describe('Guards: overlap + expired hold', () => {
  it('a confirmed booking blocks a new hold on the same dates', async () => {
    const win = nextWindow();
    const bookingId = await holdAndBook('FULL', win);
    await payAndCapture(bookingId, 'FULL');
    await expect(
      eng.hold.createHold(fx.guestUserId, {
        listingId: fx.listingId, checkIn: win.startsAt.toISOString(),
        checkOut: win.endsAt.toISOString(), guests: 2, idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeTruthy();
  });

  it('createBooking on an expired hold is rejected', async () => {
    const win = nextWindow();
    const hold = await eng.hold.createHold(fx.guestUserId, {
      listingId: fx.listingId, checkIn: win.startsAt.toISOString(),
      checkOut: win.endsAt.toISOString(), guests: 2, idempotencyKey: randomUUID(),
    });
    await prisma.hold.update({ where: { id: hold.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(
      eng.booking.createBooking(fx.guestUserId, {
        holdId: hold.id, plan: 'FULL' as never, idempotencyKey: randomUUID(),
        guestDetails: { fullName: 'X', phone: '+919876543210' } as never,
        acceptedTermsAt: new Date().toISOString(),
      }),
    ).rejects.toBeTruthy();
  });
});
