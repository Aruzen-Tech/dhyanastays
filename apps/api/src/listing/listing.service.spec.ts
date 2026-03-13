import { ListingStatus } from '@prisma/client';
import { ListingService } from './listing.service';

const prismaMock = {
  host: {
    findUnique: jest.fn(),
  },
  listing: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const notificationMock = {
  sendHostListingApproved: jest.fn().mockResolvedValue(undefined),
  sendHostListingRejected: jest.fn().mockResolvedValue(undefined),
  sendBookingConfirmed: jest.fn().mockResolvedValue(undefined),
  sendBookingCancelled: jest.fn().mockResolvedValue(undefined),
  sendBalanceDueReminder: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendSms: jest.fn().mockResolvedValue(undefined),
};

describe('ListingService', () => {
  let service: ListingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ListingService(prismaMock as never, notificationMock as never);
  });

  it('moves to pending approval when sensitive fields are changed', async () => {
    prismaMock.listing.findUnique.mockResolvedValue({
      id: 'listing-1',
      host: { userId: 'user-1' },
    });
    prismaMock.listing.update.mockResolvedValue({
      id: 'listing-1',
      status: ListingStatus.PENDING_APPROVAL,
    });
    const result = await service.updateHostListing('user-1', 'listing-1', {
      city: 'Goa',
    });
    expect(prismaMock.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ListingStatus.PENDING_APPROVAL,
          needsReapproval: true,
        }),
      }),
    );
    expect(result.status).toBe(ListingStatus.PENDING_APPROVAL);
  });
});
