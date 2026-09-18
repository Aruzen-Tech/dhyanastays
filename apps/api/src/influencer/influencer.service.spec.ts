import { ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InfluencerService } from './influencer.service';
import {
  InfluencerCommissionRuleType,
  InfluencerPayoutStatus,
} from '@prisma/client';

/**
 * Unit tests for InfluencerService — ownership/IDOR boundaries, commission
 * math, payout state transitions, and PII-safety of the bookings view.
 * All dependencies are mocked — no DB required.
 */

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inf-1',
    userId: 'user-1',
    verificationStatus: 'ACTIVE',
    minPayoutThresholdMinor: 100_000,
    payoutAccountRef: 'acct-ref',
    audienceSize: 10_000,
    ...overrides,
  };
}

describe('InfluencerService', () => {
  describe('ownership boundaries', () => {
    it('throws ForbiddenException when the authenticated user has no influencer profile', async () => {
      const prismaMock = {
        influencerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const service = new InfluencerService(prismaMock as any);

      await expect(service.getMyProfile('user-without-profile')).rejects.toThrow(ForbiddenException);
    });

    it('scopes getMyProfile strictly to the JWT subject, never to a client-supplied id', async () => {
      const findUnique = jest.fn().mockResolvedValue(makeProfile());
      const prismaMock = { influencerProfile: { findUnique } };
      const service = new InfluencerService(prismaMock as any);

      await service.getMyProfile('user-1');

      expect(findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('scopes listMyPromoCodes to the resolved influencer id, not any client input', async () => {
      const prismaMock = {
        influencerProfile: { findUnique: jest.fn().mockResolvedValue(makeProfile({ id: 'inf-42' })) },
        influencerPromoCode: { findMany: jest.fn().mockResolvedValue([]) },
      };
      const service = new InfluencerService(prismaMock as any);

      await service.listMyPromoCodes('user-1');

      expect(prismaMock.influencerPromoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { influencerId: 'inf-42' } }),
      );
    });

    it('scopes listMyCommissions to the resolved influencer id', async () => {
      const prismaMock = {
        influencerProfile: { findUnique: jest.fn().mockResolvedValue(makeProfile({ id: 'inf-42' })) },
        influencerCommission: { findMany: jest.fn().mockResolvedValue([]) },
      };
      const service = new InfluencerService(prismaMock as any);

      await service.listMyCommissions('user-1');

      expect(prismaMock.influencerCommission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { influencerId: 'inf-42' } }),
      );
    });
  });

  describe('listMyBookings — PII safety', () => {
    it('never selects or returns guest name/email/phone fields', async () => {
      const prismaMock = {
        influencerProfile: { findUnique: jest.fn().mockResolvedValue(makeProfile({ id: 'inf-1' })) },
        influencerBookingAttribution: {
          findMany: jest.fn().mockResolvedValue([
            {
              bookingId: 'bk-1',
              listingId: 'listing-1',
              attributedAt: new Date(),
              travelStartsAt: new Date(),
              travelEndsAt: new Date(),
              bookingValueMinor: 50_000,
              promoCode: { code: 'RIYA10' },
              commission: { amountMinor: 5_000, status: 'PENDING' },
            },
          ]),
        },
        booking: { findMany: jest.fn().mockResolvedValue([{ id: 'bk-1', status: 'CONFIRMED_PAID', listingId: 'listing-1' }]) },
      };
      const service = new InfluencerService(prismaMock as any);

      const result = await service.listMyBookings('user-1');

      // Assert the booking findMany select never asks for guest fields.
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, status: true, listingId: true } }),
      );
      const serialized = JSON.stringify(result);
      expect(serialized).not.toMatch(/guestName|fullName|email|phone/i);
      expect(result[0]).toEqual({
        bookingId: 'bk-1',
        listingId: 'listing-1',
        bookingDate: expect.any(Date),
        travelStartsAt: expect.any(Date),
        travelEndsAt: expect.any(Date),
        bookingValueMinor: 50_000,
        promoCode: 'RIYA10',
        bookingStatus: 'CONFIRMED_PAID',
        commission: { amountMinor: 5_000, status: 'PENDING' },
      });
    });
  });

  describe('attributeBooking — commission calculation', () => {
    function baseTxMock(overrides: Record<string, unknown> = {}) {
      return {
        influencerBookingAttribution: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async (args: any) => ({ id: 'attr-1', ...args.data })),
          count: jest.fn().mockResolvedValue(0),
        },
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bk-1',
            listingId: 'listing-1',
            startsAt: new Date('2026-01-01'),
            endsAt: new Date('2026-01-05'),
            priceSnapshot: { total: 100_000 },
          }),
        },
        influencerPromoCode: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'promo-1',
            influencerId: 'inf-1',
            campaignId: null,
            isActive: true,
            validUntil: null,
          }),
        },
        influencerCommissionRule: { findFirst: jest.fn() },
        influencerCommission: { create: jest.fn().mockResolvedValue({}) },
        ...overrides,
      };
    }

    it('computes a PERCENTAGE commission correctly (10% of booking value)', async () => {
      const prismaMock = baseTxMock();
      prismaMock.influencerCommissionRule.findFirst = jest.fn().mockResolvedValue({
        id: 'rule-1',
        type: InfluencerCommissionRuleType.PERCENTAGE,
        percentageBps: 1000, // 10.00%
        fixedAmountMinor: null,
        tierConfig: null,
      });
      const service = new InfluencerService(prismaMock as any);

      await service.attributeBooking({ bookingId: 'bk-1', promoCode: 'CODE1' });

      expect(prismaMock.influencerCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amountMinor: 10_000, status: 'PENDING' }) }),
      );
    });

    it('computes a FIXED_AMOUNT commission regardless of booking value', async () => {
      const prismaMock = baseTxMock();
      prismaMock.influencerCommissionRule.findFirst = jest.fn().mockResolvedValue({
        id: 'rule-2',
        type: InfluencerCommissionRuleType.FIXED_AMOUNT,
        percentageBps: null,
        fixedAmountMinor: 50_000,
        tierConfig: null,
      });
      const service = new InfluencerService(prismaMock as any);

      await service.attributeBooking({ bookingId: 'bk-1', promoCode: 'CODE1' });

      expect(prismaMock.influencerCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amountMinor: 50_000 }) }),
      );
    });

    it('picks the correct PERFORMANCE_TIER bracket based on prior confirmed bookings', async () => {
      const prismaMock = baseTxMock({
        influencerBookingAttribution: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async (args: any) => ({ id: 'attr-1', ...args.data })),
          count: jest.fn().mockResolvedValue(15), // falls in the 11–25 tier
        },
      });
      prismaMock.influencerCommissionRule.findFirst = jest.fn().mockResolvedValue({
        id: 'rule-3',
        type: InfluencerCommissionRuleType.PERFORMANCE_TIER,
        percentageBps: null,
        fixedAmountMinor: null,
        tierConfig: [
          { minBookings: 0, maxBookings: 10, percentageBps: 800 },
          { minBookings: 11, maxBookings: 25, percentageBps: 1000 },
          { minBookings: 26, percentageBps: 1200 },
        ],
      });
      const service = new InfluencerService(prismaMock as any);

      await service.attributeBooking({ bookingId: 'bk-1', promoCode: 'CODE1' });

      // 10% of 100,000 = 10,000
      expect(prismaMock.influencerCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amountMinor: 10_000 }) }),
      );
    });

    it('creates the attribution but no commission when no active rule is configured', async () => {
      const prismaMock = baseTxMock();
      prismaMock.influencerCommissionRule.findFirst = jest.fn().mockResolvedValue(null);
      const service = new InfluencerService(prismaMock as any);

      const result = await service.attributeBooking({ bookingId: 'bk-1', promoCode: 'CODE1' });

      expect(result).toEqual(expect.objectContaining({ bookingId: 'bk-1' }));
      expect(prismaMock.influencerCommission.create).not.toHaveBeenCalled();
    });

    it('rejects a booking that is already attributed', async () => {
      const prismaMock = baseTxMock({
        influencerBookingAttribution: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new InfluencerService(prismaMock as any);

      await expect(service.attributeBooking({ bookingId: 'bk-1', promoCode: 'CODE1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects an unknown/inactive promo code', async () => {
      const prismaMock = baseTxMock({
        influencerPromoCode: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new InfluencerService(prismaMock as any);

      await expect(service.attributeBooking({ bookingId: 'bk-1', promoCode: 'BADCODE' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('adminApproveCommission — cancellation validation', () => {
    it('refuses to approve commission for a cancelled booking', async () => {
      const prismaMock = {
        influencerCommission: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'com-1',
            status: 'PENDING',
            bookingAttribution: { bookingId: 'bk-1' },
          }),
        },
        booking: { findUnique: jest.fn().mockResolvedValue({ status: 'CANCELLED' }) },
      };
      const service = new InfluencerService(prismaMock as any);

      await expect(service.adminApproveCommission('com-1')).rejects.toThrow(BadRequestException);
    });

    it('approves commission for a non-cancelled booking', async () => {
      const prismaMock = {
        influencerCommission: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'com-1',
            status: 'PENDING',
            bookingAttribution: { bookingId: 'bk-1' },
          }),
          update: jest.fn().mockResolvedValue({ id: 'com-1', status: 'APPROVED' }),
        },
        booking: { findUnique: jest.fn().mockResolvedValue({ status: 'CONFIRMED_PAID' }) },
      };
      const service = new InfluencerService(prismaMock as any);

      const result = await service.adminApproveCommission('com-1');
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('payout lifecycle', () => {
    it('rejects an invalid transition (PENDING -> PAID, skipping APPROVED/PROCESSING)', async () => {
      const prismaMock = {
        influencerPayout: { findUnique: jest.fn().mockResolvedValue({ id: 'payout-1', status: 'PENDING' }) },
      };
      const service = new InfluencerService(prismaMock as any);

      await expect(
        service.adminReviewPayout('payout-1', { status: InfluencerPayoutStatus.PAID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks linked commissions PAID when the payout transitions to PAID', async () => {
      const updateManyCommission = jest.fn().mockResolvedValue({ count: 2 });
      const prismaMock = {
        influencerPayout: {
          findUnique: jest.fn().mockResolvedValue({ id: 'payout-1', status: 'PROCESSING' }),
        },
        $transaction: jest.fn().mockImplementation(async (fn: any) =>
          fn({
            influencerPayout: {
              update: jest.fn().mockResolvedValue({ id: 'payout-1', status: 'PAID' }),
            },
            influencerCommission: { updateMany: updateManyCommission },
          }),
        ),
      };
      const service = new InfluencerService(prismaMock as any);

      await service.adminReviewPayout('payout-1', { status: InfluencerPayoutStatus.PAID });

      expect(updateManyCommission).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { payoutId: 'payout-1' },
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });

    it('requestPayout rejects when approved balance is below the minimum threshold', async () => {
      const prismaMock = {
        influencerProfile: {
          findUnique: jest.fn().mockResolvedValue(makeProfile({ minPayoutThresholdMinor: 100_000 })),
        },
        influencerCommission: {
          findMany: jest.fn().mockResolvedValue([{ id: 'c1', amountMinor: 5_000 }]),
        },
      };
      const service = new InfluencerService(prismaMock as any);

      await expect(service.requestPayout('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('content lifecycle guards', () => {
    it('refuses to move content directly from SUBMITTED to PUBLISHED, skipping REVIEW/APPROVED', async () => {
      const prismaMock = {
        influencerContent: {
          findUnique: jest.fn().mockResolvedValue({ id: 'content-1', status: 'SUBMITTED' }),
        },
      };
      const service = new InfluencerService(prismaMock as any);

      await expect(
        service.adminReviewContent('admin-1', 'content-1', { status: 'PUBLISHED' as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('campaign application not found', () => {
    it('throws NotFoundException reviewing an application that does not exist', async () => {
      const prismaMock = {
        influencerCampaignApplication: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const service = new InfluencerService(prismaMock as any);

      await expect(
        service.adminReviewApplication('missing-app', 'admin-1', { status: 'APPROVED' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
