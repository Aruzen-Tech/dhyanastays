import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CheckinService } from './checkin.service';
import { QrTokenSignerService } from './qr-token.signer';
import { BookingStateMachine } from '../../booking/state-machine';

/**
 * Check-in verification tests (spec §11): revoked jti, time windows,
 * cross-booking substitution, bad booking state, ownership, happy path with
 * the CHECKED_IN transition + payout re-anchor.
 */

const signer = new QrTokenSignerService({
  get: (k: string) => (k === 'QR_SIGNING_SECRET' ? 'unit-test-qr-secret-32-characters!!' : ''),
} as never);

const NOW = new Date('2026-08-14T10:00:00Z');
const CHECK_IN = new Date('2026-08-14T00:00:00Z');
const CHECK_OUT = new Date('2026-08-17T00:00:00Z');

function makeBooking(over: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    status: 'CONFIRMED_PAID',
    startsAt: CHECK_IN,
    endsAt: CHECK_OUT,
    statusHistory: [],
    listing: { id: 'listing-1', title: 'Canopy Villa', host: { userId: 'host-user-1' } },
    guest: { fullName: 'Ananya R' },
    ...over,
  };
}

function makeTicket(over: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    bookingId: 'booking-1',
    qrJti: 'jti-1',
    qrRevoked: false,
    booking: makeBooking(),
    ...over,
  };
}

function makeService(ticket: unknown) {
  const scanLogs: unknown[] = [];
  const payoutUpdates: unknown[] = [];
  const tx = {
    booking: {
      findUnique: jest.fn().mockResolvedValue(makeBooking()),
      update: jest.fn().mockImplementation(async (args: { data: unknown }) => ({
        ...makeBooking(),
        ...(args.data as object),
      })),
    },
    payoutLine: {
      updateMany: jest.fn().mockImplementation(async (args: unknown) => {
        payoutUpdates.push(args);
        return { count: 1 };
      }),
    },
  };
  const prisma = {
    ticket: { findUnique: jest.fn().mockResolvedValue(ticket) },
    checkinScan: {
      create: jest.fn().mockImplementation(async (args: unknown) => {
        scanLogs.push(args);
        return {};
      }),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const svc = new CheckinService(
    prisma as never,
    signer,
    new BookingStateMachine(),
    audit as never,
  );
  return { svc, prisma, tx, scanLogs, payoutUpdates, audit };
}

function tokenFor(bookingId = 'booking-1', jti = 'jti-1') {
  return signer.sign({ bookingId, jti, checkIn: CHECK_IN, checkOut: CHECK_OUT });
}

const HOST = { sub: 'host-user-1', role: UserRole.HOST };
const OTHER_HOST = { sub: 'host-user-2', role: UserRole.HOST };
const ADMIN = { sub: 'admin-1', role: UserRole.ADMIN };

describe('CheckinService', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('scan happy path returns the booking summary and logs OK', async () => {
    const { svc, scanLogs } = makeService(makeTicket());
    const res = await svc.scan(HOST, tokenFor());
    expect(res.valid).toBe(true);
    expect(res.booking.id).toBe('booking-1');
    expect((scanLogs[0] as { data: { result: string } }).data.result).toBe('OK');
  });

  it('rejects a tampered token with INVALID_SIG', async () => {
    const { svc } = makeService(makeTicket());
    const bad = tokenFor().slice(0, -4) + 'AAAA';
    await expect(svc.scan(HOST, bad)).rejects.toThrow(BadRequestException);
  });

  it('rejects a revoked jti', async () => {
    const { svc, scanLogs } = makeService(makeTicket({ qrRevoked: true }));
    await expect(svc.scan(HOST, tokenFor())).rejects.toThrow(/REVOKED/);
    expect((scanLogs[0] as { data: { result: string } }).data.result).toBe('REVOKED');
  });

  it('rejects cross-booking substitution (jti belongs to a different booking)', async () => {
    // Token claims booking-EVIL, but the ticket for this jti is booking-1.
    const { svc } = makeService(makeTicket());
    await expect(svc.scan(HOST, tokenFor('booking-EVIL', 'jti-1'))).rejects.toThrow(
      /UNKNOWN_TICKET/,
    );
  });

  it('rejects outside the time window (nbf / exp)', async () => {
    const { svc } = makeService(makeTicket());
    jest.setSystemTime(new Date('2026-08-01T00:00:00Z')); // long before nbf
    await expect(svc.scan(HOST, tokenFor())).rejects.toThrow(/NOT_YET/);
    jest.setSystemTime(new Date('2026-09-01T00:00:00Z')); // after exp
    await expect(svc.scan(HOST, tokenFor())).rejects.toThrow(/EXPIRED/);
    jest.setSystemTime(NOW);
  });

  it('rejects a host who does not own the listing; allows admin', async () => {
    const { svc } = makeService(makeTicket());
    await expect(svc.scan(OTHER_HOST, tokenFor())).rejects.toThrow(/NOT_OWNER/);
    const { svc: svc2 } = makeService(makeTicket());
    const res = await svc2.scan(ADMIN, tokenFor());
    expect(res.valid).toBe(true);
  });

  it('rejects bad booking state (e.g. PAYMENT_PENDING) and already-checked-in', async () => {
    const pending = makeTicket({ booking: makeBooking({ status: 'PAYMENT_PENDING' }) });
    const { svc } = makeService(pending);
    await expect(svc.scan(HOST, tokenFor())).rejects.toThrow(/BAD_STATE/);

    const checkedIn = makeTicket({ booking: makeBooking({ status: 'CHECKED_IN' }) });
    const { svc: svc2 } = makeService(checkedIn);
    await expect(svc2.scan(HOST, tokenFor())).rejects.toThrow(/ALREADY_CHECKED_IN/);
  });

  it('confirm executes the CHECKED_IN transition and re-anchors the payout clock', async () => {
    const { svc, tx, payoutUpdates, audit } = makeService(makeTicket());
    const res = await svc.confirm(HOST, tokenFor());
    expect(res.checkedIn).toBe(true);

    // State machine wrote the transition through booking.update
    expect(tx.booking.update).toHaveBeenCalled();
    const updateArg = (tx.booking.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('CHECKED_IN');

    // Payout re-anchored: NOT_ELIGIBLE lines moved to scanAt + 24h
    expect(payoutUpdates).toHaveLength(1);
    const upd = payoutUpdates[0] as {
      where: { bookingId: string; status: string };
      data: { eligibleAt: Date };
    };
    expect(upd.where).toEqual({ bookingId: 'booking-1', status: 'NOT_ELIGIBLE' });
    expect(upd.data.eligibleAt.getTime()).toBe(NOW.getTime() + 24 * 3600 * 1000);

    expect(audit.log).toHaveBeenCalledWith(
      'host-user-1',
      'BOOKING_CHECKED_IN',
      'booking',
      'booking-1',
      expect.objectContaining({ evidence: 'scan' }),
    );
  });
});
