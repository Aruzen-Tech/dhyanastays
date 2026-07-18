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

const configMock = {
  get: jest.fn((_key: string, def?: string) => def ?? ''),
};

describe('ListingService', () => {
  let service: ListingService;

  beforeEach(() => {
    jest.clearAllMocks();
    configMock.get.mockImplementation(
      (_key: string, def?: string) => def ?? '',
    );

    service = new ListingService(
      prismaMock as never,
      notificationMock as never,
      configMock as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves to pending approval when sensitive fields are changed', async () => {
    // updateHostListing reads the listing twice: first for the ownership check,
    // then a re-fetch (with rateRules + media) that becomes the return value.
    prismaMock.listing.findUnique
      .mockResolvedValueOnce({
        id: 'listing-1',
        host: { userId: 'user-1' },
      })
      .mockResolvedValueOnce({
        id: 'listing-1',
        status: ListingStatus.PENDING_APPROVAL,
        rateRules: [],
        media: [],
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
    expect(result!.status).toBe(ListingStatus.PENDING_APPROVAL);
  });

  it('rejects invalid map bounds before querying the database', async () => {
    await expect(
      service.getListingsByBounds(Number.NaN, 79.6, 12.2, 80),
    ).rejects.toThrow('Map bounds must be valid numbers');

    expect(prismaMock.listing.findMany).not.toHaveBeenCalled();
  });

  it('limits map viewport results', async () => {
    prismaMock.listing.findMany.mockResolvedValue([]);

    await service.getListingsByBounds(
      11.8,
      79.6,
      12.2,
      80,
    );

    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
  });

  it('returns approved listings from Meilisearch hits', async () => {
    configMock.get.mockImplementation((key: string, def?: string) => {
      if (key === 'MEILI_URL') return 'http://localhost:7700';
      if (key === 'MEILI_MASTER_KEY') return 'meili_dev_key';
      return def ?? '';
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        hits: [{ id: 'listing-1' }, { id: 'listing-2' }],
      }),
    } as never);

    const listings = [
      { id: 'listing-1', title: 'Goa Wellness Stay' },
      { id: 'listing-2', title: 'Goa Beach Retreat' },
    ];

    prismaMock.listing.findMany.mockResolvedValue(listings);

    await expect(service.searchListings('Goa')).resolves.toEqual(listings);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:7700/indexes/listings/search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ q: 'Goa', limit: 50 }),
      }),
    );

    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['listing-1', 'listing-2'] },
          status: ListingStatus.APPROVED,
        },
      }),
    );
  });

  it('preserves Meilisearch relevance order', async () => {
    configMock.get.mockImplementation((key: string, def?: string) => {
      if (key === 'MEILI_URL') return 'http://localhost:7700';
      if (key === 'MEILI_MASTER_KEY') return 'meili_dev_key';
      return def ?? '';
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        hits: [
          { id: 'listing-2' },
          { id: 'listing-1' },
        ],
      }),
    } as never);

    // Prisma does not guarantee the same order as the ID list.
    prismaMock.listing.findMany.mockResolvedValue([
      { id: 'listing-1', title: 'Lower ranked stay' },
      { id: 'listing-2', title: 'Top ranked stay' },
    ]);

    const result = await service.searchListings('wellness');

    expect(result.map((listing) => listing.id)).toEqual([
      'listing-2',
      'listing-1',
    ]);
  });

  it('falls back to database search when Meilisearch returns no hits', async () => {
    configMock.get.mockImplementation((key: string, def?: string) => {
      if (key === 'MEILI_URL') return 'http://localhost:7700';
      if (key === 'MEILI_MASTER_KEY') return 'meili_dev_key';
      return def ?? '';
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        hits: [],
      }),
    } as never);

    const fallbackListings = [{ id: 'listing-3', title: 'Goa Forest Retreat' }];

    prismaMock.listing.findMany.mockResolvedValue(fallbackListings);

    await expect(service.searchListings('Goa')).resolves.toEqual(
      fallbackListings,
    );

    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ListingStatus.APPROVED,
          OR: [
            { title: { contains: 'Goa', mode: 'insensitive' } },
            { city: { contains: 'Goa', mode: 'insensitive' } },
            { state: { contains: 'Goa', mode: 'insensitive' } },
            { description: { contains: 'Goa', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });
});
