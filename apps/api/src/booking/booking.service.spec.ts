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
  };
}

function makePricingMock() {
  return {
    computeRefundAmount: jest.fn(),
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
      );

      const result = await service.createBooking('guest-1', {
        holdId: 'hold-1',
        plan: 'FULL' as any,
        idempotencyKey: 'idem-1',
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
      );

      await service.createBooking('guest-1', {
        holdId: 'hold-1',
        plan: 'DEPOSIT_50' as any,
        idempotencyKey: 'idem-2',
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
      );

      await expect(
        service.createBooking('guest-1', {
          holdId: 'hold-1',
          plan: 'FULL' as any,
          idempotencyKey: 'idem-3',
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
      );

      await expect(
        service.createBooking('guest-1', {
          holdId: 'hold-1',
          plan: 'FULL' as any,
          idempotencyKey: 'idem-4',
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
      );

      const result = await service.createBooking('guest-1', {
        holdId: 'hold-1',
        plan: 'FULL' as any,
        idempotencyKey: 'idem-5',
      });

      expect(result).toBe(existingBooking);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('transitionToBalanceDue()', () => {
    it('updates CONFIRMED_DEPOSIT bookings past balanceDueAt', async () => {
      const prismaMock = {
        booking: {
          updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };

      const auditMock = makeAuditMock();
      const service = new BookingService(
        prismaMock as any,
        makePricingMock() as any,
        auditMock as any,
        makeLedgerMock() as any,
        makeNotificationMock() as any,
      );

      const count = await service.transitionToBalanceDue();
      expect(count).toBe(3);
      expect(prismaMock.booking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'CONFIRMED_DEPOSIT' }),
          data: { status: 'BALANCE_DUE' },
        }),
      );
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
        startsAt: checkIn,
        payments: [{ status: 'CAPTURED', amount: 17050 }],
      };

      const txMock = {
        booking: { update: jest.fn().mockResolvedValue({ ...booking, status: 'REFUNDED' }) },
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
        startsAt: checkIn,
        payments: [{ status: 'CAPTURED', amount: 17050 }],
      };

      const txMock = {
        booking: { update: jest.fn().mockResolvedValue({ ...booking, status: 'CANCELLED' }) },
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
      );

      const result = await service.cancelBooking('booking-1', 'guest-1', 'GUEST', {});

      // cancelBooking() returns the updated booking (not { booking, refundAmount })
      expect(result.status).toBe('CANCELLED');
      // No refund should be created for 0% refund
      expect(txMock.refund.create).not.toHaveBeenCalled();
      expect(txMock.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED' },
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
      );

      await expect(
        service.cancelBooking('booking-1', 'guest-1', 'GUEST', {}),
      ).rejects.toThrow('Cannot cancel booking in status: COMPLETED');
    });
  });
});
