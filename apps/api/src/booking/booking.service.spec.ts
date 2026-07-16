import { BookingService } from './booking.service';
import { PricingService } from '../pricing/pricing.service';

/**
 * Unit tests for BookingService.
 * All dependencies are mocked — no DB or external services required.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

function makeAuditMock() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeLedgerMock() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

function makeNotificationMock() {
  return {
    sendBookingConfirmed: jest.fn().mockResolvedValue(undefined),
    sendBookingCancelled: jest.fn().mockResolvedValue(undefined),
    sendBalanceDueReminder: jest.fn().mockResolvedValue(undefined),
    sendHostListingApproved: jest.fn().mockResolvedValue(undefined),
    sendHostListingRejected: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendSms: jest.fn().mockResolvedValue(undefined),
    buildBookingConfirmedEmail: jest.fn().mockReturnValue({ to: '', subject: '', html: '' }),
    buildBookingConfirmedSms: jest.fn().mockReturnValue(null),
  };
}

function makeOutboxMock() {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    claimPending: jest.fn().mockResolvedValue([]),
    markSent: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    getPreference: jest.fn().mockResolvedValue({}),
    upsertPreference: jest.fn().mockResolvedValue(undefined),
  };
}

function makePricingMock() {
  return {
    computeRefundAmount: jest.fn(),
  };
}

function makeStateMachineMock() {
  // The state machine's contract for these tests: route the transition
  // through tx.booking.update with the to-state we'd expect, so the existing
  // assertions against tx.booking.update.toHaveBeenCalledWith continue to work.
  return {
    transition: jest
      .fn()
      .mockImplementation(async (tx: any, booking: any, event: string) => {
        const toMap: Record<string, string> = {
          PAYMENT_CONFIRMED_FULL: 'CONFIRMED_PAID',
          PAYMENT_CONFIRMED_DEPOSIT: 'CONFIRMED_DEPOSIT',
          PAY_LATER_FIRST_CAPTURED: 'CONFIRMED_DEPOSIT',
          PAY_LATER_INSTALMENT_CAPTURED: 'CONFIRMED_DEPOSIT',
          PAY_LATER_FINAL_CAPTURED: 'CONFIRMED_PAID',
          BALANCE_DUE_TRIGGERED: 'BALANCE_DUE',
          BALANCE_PAID: 'CONFIRMED_PAID',
          STAY_COMPLETED: 'COMPLETED',
          AUTO_COMPLETED: 'COMPLETED',
          ADMIN_FULL_REFUND_ISSUED: 'REFUNDED',
        };
        const to = toMap[event] ?? 'CANCELLED';
        // Cancellation paths choose CANCELLED/REFUNDED via refund context.
        const cancelEvents = new Set([
          'GUEST_CANCELLED',
          'ADMIN_CANCELLED',
          'AUTO_CANCEL_UNPAID_BALANCE',
          'AUTO_CANCEL_PAY_LATER_DEFAULT',
        ]);
        const status = cancelEvents.has(event)
          ? ((tx?._refundAmount ?? 0) > 0 ? 'REFUNDED' : 'CANCELLED')
          : to;
        if (tx?.booking?.update) {
          return tx.booking.update({
            where: { id: booking.id },
            data: { status, statusHistory: [] },
          });
        }
        return { ...booking, status };
      }),
  };
}

function makePayLaterMock() {
  return {
    createPlanFromFirstCapture: jest.fn().mockResolvedValue(undefined),
    cancelPlan: jest.fn().mockResolvedValue(undefined),
  };
}

const SNAPSHOT = {
  listingId: 'listing-1',
  checkIn: '2025-12-01',
  checkOut: '2025-12-04',
  nights: 3,
  guests: 2,
  baseNightlyRate: 5000,
  nightlyBreakdown: [],
  subtotal: 15000,
  cleaningFee: 500,
  platformFeeRate: 0.1,
  platformFee: 1550,
  total: 17050,
  depositAmount: 8525,
  balanceAmount: 8525,
  currency: 'INR',
  snapshotAt: new Date().toISOString(),
};

const HOLD = {
  id: 'hold-1',
  listingId: 'listing-1',
  guestId: 'guest-1',
  startsAt: new Date('2025-12-01'),
  endsAt: new Date('2025-12-04'),
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min from now
  priceSnapshot: SNAPSHOT,
};

describe('BookingService', () => {
  describe('createBooking()', () => {
    it('creates a PAYMENT_PENDING booking from a valid hold (FULL plan)', async () => {
      const createdBooking = {
        id: 'booking-1',
        listingId: 'listing-1',
        guestId: 'guest-1',
        holdId: 'hold-1',
        status: 'PAYMENT_PENDING',
        plan: 'FULL',
        startsAt: HOLD.startsAt,
        endsAt: HOLD.endsAt,
        priceSnapshot: SNAPSHOT,
        balanceDueAt: null,
      };

      const txMock = {
        hold: { findUnique: jest.fn().mockResolvedValue(HOLD) },
        booking: { create: jest.fn().mockResolvedValue(createdBooking) },
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      const result = await service.createBooking('guest-1', {
        holdId: 'hold-1',
        plan: 'FULL' as any,
        idempotencyKey: 'idem-1',
        guestDetails: { fullName: 'Test Guest', phone: '9999999999' } as any,
        acceptedTermsAt: new Date().toISOString(),
      });

      expect(result.status).toBe('PAYMENT_PENDING');
      expect(result.plan).toBe('FULL');
      expect(txMock.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAYMENT_PENDING',
            plan: 'FULL',
            balanceDueAt: null,
          }),
        }),
      );
    });

    it('sets balanceDueAt for DEPOSIT_50 plan', async () => {
      const checkIn = new Date('2025-12-01');
      const holdWithFutureCheckIn = { ...HOLD, startsAt: checkIn };

      const txMock = {
        hold: { findUnique: jest.fn().mockResolvedValue(holdWithFutureCheckIn) },
        booking: { create: jest.fn().mockResolvedValue({ id: 'b-2', status: 'PAYMENT_PENDING', plan: 'DEPOSIT_50', balanceDueAt: new Date() }) },
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      await service.createBooking('guest-1', {
        holdId: 'hold-1',
        plan: 'DEPOSIT_50' as any,
        idempotencyKey: 'idem-2',
        guestDetails: { fullName: 'Test Guest', phone: '9999999999' } as any,
        acceptedTermsAt: new Date().toISOString(),
      });

      const createCall = txMock.booking.create.mock.calls[0][0];
      // balanceDueAt should be 48h before checkIn
      const expectedDue = new Date(checkIn.getTime() - 48 * 60 * 60 * 1000);
      expect(createCall.data.balanceDueAt.getTime()).toBeCloseTo(
        expectedDue.getTime(),
        -3, // within 1 second
      );
    });

    it('throws if hold is expired', async () => {
      const expiredHold = {
        ...HOLD,
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 min ago
      };

      const txMock = {
        hold: { findUnique: jest.fn().mockResolvedValue(expiredHold) },
        booking: { create: jest.fn() },
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      await expect(
        service.createBooking('guest-1', {
          holdId: 'hold-1',
          plan: 'FULL' as any,
          idempotencyKey: 'idem-3',
          guestDetails: { fullName: 'Test Guest', phone: '9999999999' } as any,
          acceptedTermsAt: new Date().toISOString(),
        }),
      ).rejects.toThrow('Hold has expired');
    });

    it('throws ForbiddenException if hold belongs to another guest', async () => {
      const otherGuestHold = { ...HOLD, guestId: 'other-guest' };

      const txMock = {
        hold: { findUnique: jest.fn().mockResolvedValue(otherGuestHold) },
        booking: { create: jest.fn() },
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      await expect(
        service.createBooking('guest-1', {
          holdId: 'hold-1',
          plan: 'FULL' as any,
          idempotencyKey: 'idem-4',
          guestDetails: { fullName: 'Test Guest', phone: '9999999999' } as any,
          acceptedTermsAt: new Date().toISOString(),
        }),
      ).rejects.toThrow('Hold belongs to another user');
    });

    it('returns existing booking idempotently if same holdId already booked', async () => {
      const existingBooking = {
        id: 'booking-existing',
        guestId: 'guest-1',
        holdId: 'hold-1',
        status: 'PAYMENT_PENDING',
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(existingBooking) },
        $transaction: jest.fn(),
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      const result = await service.createBooking('guest-1', {
        holdId: 'hold-1',
        plan: 'FULL' as any,
        idempotencyKey: 'idem-5',
        guestDetails: { fullName: 'Test Guest', phone: '9999999999' } as any,
        acceptedTermsAt: new Date().toISOString(),
      });

      expect(result).toBe(existingBooking);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('transitionToBalanceDue()', () => {
    it('routes each due booking through the state machine', async () => {
      const dueIds = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];

      // Tracks per-id calls into the state machine.
      const transitions: string[] = [];
      const smMock = {
        transition: jest
          .fn()
          .mockImplementation(
            async (_tx: any, booking: any, event: string) => {
              transitions.push(`${booking.id}:${event}`);
              return { ...booking, status: 'BALANCE_DUE' };
            },
          ),
      };

      const txMock = {
        booking: {
          findUnique: jest.fn().mockImplementation(async (args: any) => ({
            id: args.where.id,
            status: 'CONFIRMED_DEPOSIT',
            plan: 'DEPOSIT_50',
            startsAt: new Date(),
            endsAt: new Date(),
            balanceDueAt: new Date(0),
            payLaterMonths: null,
            statusHistory: [],
          })),
        },
      };
      const prismaMock = {
        booking: { findMany: jest.fn().mockResolvedValue(dueIds) },
        $transaction: jest
          .fn()
          .mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        smMock as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      const count = await service.transitionToBalanceDue();
      expect(count).toBe(3);
      expect(transitions).toEqual([
        'b1:BALANCE_DUE_TRIGGERED',
        'b2:BALANCE_DUE_TRIGGERED',
        'b3:BALANCE_DUE_TRIGGERED',
      ]);
    });

    it('skips bookings whose status changed concurrently', async () => {
      const smMock = { transition: jest.fn() };
      const txMock = {
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'b1',
            status: 'CANCELLED', // concurrent change — should skip
            plan: 'DEPOSIT_50',
            startsAt: new Date(),
            endsAt: new Date(),
            balanceDueAt: new Date(0),
            payLaterMonths: null,
            statusHistory: [],
          }),
        },
      };
      const prismaMock = {
        booking: { findMany: jest.fn().mockResolvedValue([{ id: 'b1' }]) },
        $transaction: jest
          .fn()
          .mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        smMock as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      const count = await service.transitionToBalanceDue();
      expect(count).toBe(0);
      expect(smMock.transition).not.toHaveBeenCalled();
    });
  });

  describe('cancelBooking()', () => {
    it('cancels a CONFIRMED_PAID booking with 100% refund (≥48h before check-in)', async () => {
      const checkIn = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const booking = {
        id: 'booking-1',
        guestId: 'guest-1',
        listingId: 'listing-1',
        status: 'CONFIRMED_PAID',
        plan: 'FULL',
        startsAt: checkIn,
        payments: [{ status: 'CAPTURED', amount: 17050 }],
        priceSnapshot: { total: 17050, addOnsTotal: 0, subtotal: 15500, cleaningFee: 1000 } as any,
      };

      const txMock = {
        booking: {
          update: jest.fn().mockResolvedValue({ ...booking, status: 'REFUNDED' }),
          findUnique: jest.fn().mockResolvedValue(booking),
        },
        refund: { create: jest.fn().mockResolvedValue({}) },
      };

      const prismaMock = {
        booking: {
          findUnique: jest.fn().mockResolvedValue(booking),
        },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const pricingMock = makePricingMock();
      (pricingMock.computeRefundAmount as jest.Mock).mockReturnValue(17050); // 100%

      const ledgerMock = makeLedgerMock();
      const auditMock = makeAuditMock();

      const service = new BookingService(
        prismaMock as any,
        pricingMock as any,
        auditMock as any,
        ledgerMock as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      const result = await service.cancelBooking('booking-1', 'guest-1', 'GUEST', {
        reason: 'Changed plans',
      });

      // cancelBooking() returns the updated booking (not { booking, refundAmount })
      expect(result.status).toBe('REFUNDED');
      // Verify the refund record was created with the correct amount
      expect(txMock.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 17050 }),
        }),
      );
    });

    it('cancels with 0% refund (≤10h before check-in)', async () => {
      const checkIn = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const booking = {
        id: 'booking-1',
        guestId: 'guest-1',
        listingId: 'listing-1',
        status: 'CONFIRMED_PAID',
        plan: 'FULL',
        startsAt: checkIn,
        payments: [{ status: 'CAPTURED', amount: 17050 }],
        priceSnapshot: { total: 17050, addOnsTotal: 0, subtotal: 15500, cleaningFee: 1000 } as any,
      };

      const txMock = {
        booking: {
          update: jest.fn().mockResolvedValue({ ...booking, status: 'CANCELLED' }),
          findUnique: jest.fn().mockResolvedValue(booking),
        },
        refund: { create: jest.fn() },
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(booking) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const pricingMock = makePricingMock();
      (pricingMock.computeRefundAmount as jest.Mock).mockReturnValue(0); // 0%

      const service = new BookingService(
        prismaMock as any,
        pricingMock as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      const result = await service.cancelBooking('booking-1', 'guest-1', 'GUEST', {});

      // cancelBooking() returns the updated booking (not { booking, refundAmount })
      expect(result.status).toBe('CANCELLED');
      // No refund should be created for 0% refund
      expect(txMock.refund.create).not.toHaveBeenCalled();
      // SM also writes statusHistory; assert on the data object as a superset.
      expect(txMock.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('throws ForbiddenException if guest tries to cancel another guest booking', async () => {
      const booking = {
        id: 'booking-1',
        guestId: 'other-guest',
        status: 'CONFIRMED_PAID',
        payments: [],
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(booking) },
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      await expect(
        service.cancelBooking('booking-1', 'guest-1', 'GUEST', {}),
      ).rejects.toThrow('Access denied');
    });

    it('throws BadRequestException if booking is already COMPLETED', async () => {
      const booking = {
        id: 'booking-1',
        guestId: 'guest-1',
        status: 'COMPLETED',
        payments: [],
      };

      const prismaMock = {
        booking: { findUnique: jest.fn().mockResolvedValue(booking) },
      };

      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        makeAuditMock() as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
        makeOutboxMock() as any,
        { onReferredUserFirstBooking: jest.fn().mockResolvedValue(undefined) } as any,
        { createBookingAddOns: jest.fn().mockResolvedValue(undefined), cancelBookingAddOns: jest.fn().mockResolvedValue(0) } as any,
        { awardPoints: jest.fn().mockResolvedValue(undefined), pointsForPaise: jest.fn().mockReturnValue(0) } as any,
        makePayLaterMock() as any,
        makeStateMachineMock() as any,
        { verify: jest.fn().mockReturnValue(true), sign: jest.fn().mockReturnValue("sig") } as any,
      );

      await expect(
        service.cancelBooking('booking-1', 'guest-1', 'GUEST', {}),
      ).rejects.toThrow('Cannot cancel booking in status: COMPLETED');
    });
  });
});
