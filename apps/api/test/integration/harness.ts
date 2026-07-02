/**
 * Integration test harness — runs against the REAL dev Postgres
 * (DATABASE_URL from .env). Proves the DB-level correctness layers that
 * unit tests with mocks can't: the overlap trigger, GiST index, ledger
 * immutability triggers, ProcessedRazorpayEvent dedup, and SERIALIZABLE +
 * FOR UPDATE concurrency control.
 *
 * Isolation strategy: every run uses a unique prefix (RUN_TAG). All fixture
 * rows are created with IDs/keys carrying that tag and torn down in afterAll.
 * Ledger immutability triggers are toggled off (as table owner) only during
 * cleanup of test ledger rows.
 *
 * This file is NOT a spec — it's imported by the *.int-spec.ts files.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID, createHmac } from 'crypto';

export const RUN_TAG = `inttest_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

// Same secret the app uses by default in non-prod (env.validation default).
// We sign snapshots so confirmPayment's HMAC re-check passes.
const SNAPSHOT_SECRET =
  process.env.PRICE_SNAPSHOT_SECRET ?? 'dev-snapshot-secret-min-32-characters!';

export const prisma = new PrismaClient();

export interface Fixtures {
  guestUserId: string;
  hostUserId: string;
  hostId: string;
  listingId: string;
}

/** Canonicalize + sign a price snapshot exactly like PriceSnapshotSignerService. */
export function signSnapshot(snapshot: Record<string, unknown>): string {
  const fields = [
    'listingId', 'checkIn', 'checkOut', 'nights', 'guests', 'subtotal',
    'cleaningFee', 'platformFee', 'addOnsTotal', 'gstRate', 'gstAmount',
    'total', 'depositAmount', 'balanceAmount', 'currency', 'snapshotAt', 'expiresAt',
  ];
  const parts = fields.map((f) => `${f}=${JSON.stringify(snapshot[f] ?? '')}`);
  const addOns = Array.isArray(snapshot.addOns) ? snapshot.addOns : [];
  const addOnDigest = addOns
    .map((a: any) => `${a.addOnId}:${a.quantity}:${a.unitPrice}:${a.totalPrice}`)
    .sort()
    .join(',');
  parts.push(`addOns=${addOnDigest}`);
  return createHmac('sha256', SNAPSHOT_SECRET).update(parts.join('|')).digest('hex');
}

/** Build a signed FULL-plan snapshot for the given listing + amount. */
export function buildSignedSnapshot(
  listingId: string,
  total: number,
  checkIn: string,
  checkOut: string,
): Record<string, unknown> {
  const snap: Record<string, unknown> = {
    listingId,
    checkIn,
    checkOut,
    nights: 3,
    guests: 2,
    baseNightlyRate: Math.round((total * 0.88) / 3),
    nightlyBreakdown: [],
    subtotal: Math.round(total * 0.85),
    cleaningFee: Math.round(total * 0.03),
    platformFeeRate: 0.1,
    platformFee: Math.round(total * 0.1),
    addOnsTotal: 0,
    addOns: [],
    gstRate: 0.18,
    gstAmount: Math.round(total * 0.02),
    total,
    depositAmount: Math.round(total / 2),
    balanceAmount: total - Math.round(total / 2),
    payLaterFirstInstalment: [],
    currency: 'INR',
    snapshotAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
  snap.hmac = signSnapshot(snap);
  return snap;
}

/** Create the shared fixtures: guest, host user, host, approved listing + rate. */
export async function setupFixtures(): Promise<Fixtures> {
  const guestUserId = `${RUN_TAG}_guest`;
  const hostUserId = `${RUN_TAG}_hostuser`;
  const hostId = `${RUN_TAG}_host`;
  const listingId = `${RUN_TAG}_listing`;

  await prisma.user.create({
    data: {
      id: guestUserId,
      email: `${RUN_TAG}_guest@test.local`,
      fullName: 'Int Test Guest',
      role: 'GUEST',
      passwordHash: 'x',
    },
  });
  await prisma.user.create({
    data: {
      id: hostUserId,
      email: `${RUN_TAG}_host@test.local`,
      fullName: 'Int Test Host',
      role: 'HOST',
      passwordHash: 'x',
    },
  });
  await prisma.host.create({
    data: { id: hostId, userId: hostUserId, verificationStatus: 'APPROVED' },
  });
  await prisma.listing.create({
    data: {
      id: listingId,
      hostId,
      createdById: hostUserId,
      title: 'Int Test Listing',
      description: 'integration fixture',
      city: 'Rishikesh',
      state: 'UK',
      country: 'India',
      status: 'APPROVED',
      rateRules: {
        create: {
          baseNightlyRate: 500000,
          maxGuests: 4,
          minNights: 1,
          cleaningFee: 100000,
        },
      },
    },
  });

  return { guestUserId, hostUserId, hostId, listingId };
}

/**
 * Create a PAYMENT_PENDING booking (with its hold) for the given dates.
 * Returns the booking id. Uses unique IDs so multiple can coexist across
 * different date ranges.
 */
export async function createPendingBooking(
  fx: Fixtures,
  opts: {
    startsAt: Date;
    endsAt: Date;
    total: number;
    plan?: 'FULL' | 'DEPOSIT_50';
  },
): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const holdId = `${RUN_TAG}_hold_${suffix}`;
  const bookingId = `${RUN_TAG}_bk_${suffix}`;
  const snapshot = buildSignedSnapshot(
    fx.listingId,
    opts.total,
    opts.startsAt.toISOString(),
    opts.endsAt.toISOString(),
  );

  await prisma.hold.create({
    data: {
      id: holdId,
      listingId: fx.listingId,
      guestId: fx.guestUserId,
      startsAt: opts.startsAt,
      endsAt: opts.endsAt,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      priceSnapshot: snapshot as any,
      idempotencyKey: `${RUN_TAG}_idem_${suffix}`,
    },
  });
  await prisma.booking.create({
    data: {
      id: bookingId,
      listingId: fx.listingId,
      guestId: fx.guestUserId,
      holdId,
      status: 'PAYMENT_PENDING',
      plan: opts.plan ?? 'FULL',
      startsAt: opts.startsAt,
      endsAt: opts.endsAt,
      priceSnapshot: snapshot as any,
      acceptedTermsAt: new Date(),
      statusHistory: [],
    },
  });
  return bookingId;
}

/** Tear down EVERYTHING this run created. Order respects FKs. */
export async function teardownFixtures(): Promise<void> {
  // Ledger rows are immutable via trigger — disable as owner to delete ours.
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "LedgerEvent" DISABLE TRIGGER USER');
    await prisma.$executeRawUnsafe(
      `DELETE FROM "LedgerEvent" WHERE "bookingId" LIKE '${RUN_TAG}%'`,
    );
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "LedgerEvent" ENABLE TRIGGER USER');
  }

  await prisma.$executeRawUnsafe(
    `DELETE FROM "ProcessedRazorpayEvent" WHERE "eventId" LIKE '${RUN_TAG}%'`,
  );
  await prisma.payoutLine.deleteMany({ where: { bookingId: { startsWith: RUN_TAG } } });
  await prisma.payment.deleteMany({ where: { bookingId: { startsWith: RUN_TAG } } });
  await prisma.booking.deleteMany({ where: { id: { startsWith: RUN_TAG } } });
  await prisma.hold.deleteMany({ where: { id: { startsWith: RUN_TAG } } });
  await prisma.listing.deleteMany({ where: { id: { startsWith: RUN_TAG } } });
  await prisma.host.deleteMany({ where: { id: { startsWith: RUN_TAG } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: RUN_TAG } } });
}
