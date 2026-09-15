import { ListingService } from './listing.service';

/**
 * Moderation-request behaviour: the reviewer's two unanswered questions were
 * "when did this enter the queue" and "what changed since it was approved".
 */

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    listing: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    listingMedia: { findMany: jest.fn().mockResolvedValue([]) },
    listingReviewRequest: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    rateRule: { updateMany: jest.fn() },
    adminNotification: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    ...over,
  };
}

function build(prisma: unknown) {
  const svc = new ListingService(
    prisma as never,
    { log: jest.fn().mockResolvedValue(undefined) } as never,
    { enqueue: jest.fn().mockResolvedValue(undefined) } as never,
    // A complete host application is a precondition for submission; these tests
    // exercise moderation, so the gate is satisfied.
    { assertCompleteForListing: jest.fn().mockResolvedValue(undefined) } as never,
  );
  // Search indexing and host notifications are fire-and-forget side effects.
  (svc as unknown as Record<string, unknown>).meiliIndex = jest.fn();
  (svc as unknown as Record<string, unknown>).meiliDelete = jest.fn();
  (svc as unknown as Record<string, unknown>).sendListingReviewNotification = jest.fn();
  return svc;
}

const MEDIA_OK = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, mediaType: 'image/jpeg' })),
  { id: 'v1', mediaType: 'video/mp4' },
];

describe('submitListingForApproval', () => {
  it('opens a NEW review request recording what the reviewer must judge', async () => {
    const prisma = makePrisma();
    prisma.listing.findUnique.mockResolvedValue({
      id: 'l1',
      hostId: 'h1',
      status: 'DRAFT',
      title: 'Palm Grove Retreat',
      city: 'Alleppey',
      state: 'Kerala',
      host: { userId: 'u1' },
      media: MEDIA_OK,
    });
    const svc = build(prisma);

    await svc.submitListingForApproval('u1', 'l1');

    const data = prisma.listingReviewRequest.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      listingId: 'l1',
      type: 'NEW',
      submittedById: 'u1',
      photoCount: 5,
      videoCount: 1,
    });
  });
});

describe('re-approval diff', () => {
  const approved = {
    id: 'l1',
    hostId: 'h1',
    status: 'APPROVED',
    city: 'Alleppey',
    state: 'Kerala',
    country: 'India',
    description: 'Backwater cottage.',
    host: { userId: 'u1' },
  };

  it('captures before and after for the fields that triggered it', async () => {
    const prisma = makePrisma();
    prisma.listing.findUnique.mockResolvedValue(approved);
    const svc = build(prisma);

    await svc.updateHostListing('u1', 'l1', {
      city: 'Kochi',
      description: 'Sea-facing villa.',
    } as never);

    const data = prisma.listingReviewRequest.create.mock.calls[0][0].data;
    expect(data.type).toBe('REAPPROVAL');
    expect(data.diff).toEqual({
      city: { before: 'Alleppey', after: 'Kochi' },
      description: { before: 'Backwater cottage.', after: 'Sea-facing villa.' },
    });
  });

  it('ignores a sensitive field resubmitted unchanged', async () => {
    const prisma = makePrisma();
    prisma.listing.findUnique.mockResolvedValue(approved);
    const svc = build(prisma);

    // Same city re-sent alongside a real change — noise the reviewer shouldn't read.
    await svc.updateHostListing('u1', 'l1', {
      city: 'Alleppey',
      state: 'Tamil Nadu',
    } as never);

    const data = prisma.listingReviewRequest.create.mock.calls[0][0].data;
    expect(Object.keys(data.diff)).toEqual(['state']);
  });

  it('opens no request when nothing sensitive changed', async () => {
    const prisma = makePrisma();
    prisma.listing.findUnique.mockResolvedValue(approved);
    const svc = build(prisma);

    await svc.updateHostListing('u1', 'l1', { title: 'Nicer name' } as never);

    expect(prisma.listingReviewRequest.create).not.toHaveBeenCalled();
    // …and the listing is not pushed back into the queue.
    const update = prisma.listing.update.mock.calls[0][0].data;
    expect(update.status).toBeUndefined();
  });

  it('supersedes an earlier open request rather than queueing twice', async () => {
    const prisma = makePrisma();
    prisma.listing.findUnique.mockResolvedValue(approved);
    const svc = build(prisma);

    await svc.updateHostListing('u1', 'l1', { city: 'Kochi' } as never);

    // A host editing again while waiting must not produce two open rows.
    expect(prisma.listingReviewRequest.deleteMany).toHaveBeenCalledWith({
      where: { listingId: 'l1', decision: null },
    });
  });
});

describe('reviewListing', () => {
  it('closes the open request so it becomes review history', async () => {
    const prisma = makePrisma();
    prisma.listing.findUnique.mockResolvedValue({
      id: 'l1', hostId: 'h1', status: 'PENDING_APPROVAL', title: 'X', rateRules: [], media: [],
    });
    prisma.listingReviewRequest.findFirst.mockResolvedValue({ id: 'req1' });
    const svc = build(prisma);

    await svc.reviewListing('admin1', 'l1', 'reject', 'Photos look like stock images');

    expect(prisma.listingReviewRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req1' },
        data: expect.objectContaining({
          decision: 'REJECTED',
          decisionNote: 'Photos look like stock images',
          decidedById: 'admin1',
        }),
      }),
    );
  });

  it('still decides when no request row exists (pre-existing listings)', async () => {
    const prisma = makePrisma();
    prisma.listing.findUnique.mockResolvedValue({
      id: 'l1', hostId: 'h1', status: 'PENDING_APPROVAL', title: 'X', rateRules: [], media: [],
    });
    prisma.listingReviewRequest.findFirst.mockResolvedValue(null);
    const svc = build(prisma);

    await expect(svc.reviewListing('admin1', 'l1', 'approve')).resolves.toBeDefined();
    expect(prisma.listingReviewRequest.update).not.toHaveBeenCalled();
  });
});

describe('getPendingListings', () => {
  const base = {
    rateRules: [], media: [], _count: { media: 0 },
    host: { id: 'h1', verificationStatus: 'APPROVED', createdAt: new Date(), user: {}, _count: { listings: 1 } },
    needsReapproval: false,
  };

  it('orders by when each listing entered the queue, not when it was created', async () => {
    const prisma = makePrisma();
    prisma.listing.findMany.mockResolvedValue([
      {
        ...base, id: 'old-listing-resubmitted',
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-09-10'),
        reviewRequests: [{ decision: null, type: 'REAPPROVAL', submittedAt: new Date('2026-09-10'), diff: null }],
      },
      {
        ...base, id: 'newer-listing-submitted-first',
        createdAt: new Date('2026-08-01'), updatedAt: new Date('2026-08-02'),
        reviewRequests: [{ decision: null, type: 'NEW', submittedAt: new Date('2026-08-02'), diff: null }],
      },
    ]);
    const svc = build(prisma);

    const res = await svc.getPendingListings();

    // The old listing was created first but re-entered the queue later, so it
    // must not jump the queue.
    expect(res.map((r) => r.id)).toEqual([
      'newer-listing-submitted-first',
      'old-listing-resubmitted',
    ]);
  });

  it('exposes the diff, media counts and prior decisions', async () => {
    const prisma = makePrisma();
    prisma.listing.findMany.mockResolvedValue([
      {
        ...base,
        id: 'l1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-09-10'),
        media: MEDIA_OK.map((m) => ({ ...m, url: 'u', sortOrder: 0 })),
        _count: { media: 6 },
        reviewRequests: [
          {
            decision: null, type: 'REAPPROVAL', submittedAt: new Date('2026-09-10'),
            diff: { city: { before: 'Alleppey', after: 'Kochi' } },
          },
          {
            decision: 'REJECTED', type: 'NEW', submittedAt: new Date('2026-08-01'),
            decisionNote: 'Stock photos', decidedAt: new Date('2026-08-02'),
          },
        ],
      },
    ]);
    const svc = build(prisma);

    const [row] = await svc.getPendingListings();

    expect(row.reviewType).toBe('REAPPROVAL');
    expect(row.diff).toEqual({ city: { before: 'Alleppey', after: 'Kochi' } });
    expect(row).toMatchObject({ photoCount: 5, videoCount: 1, mediaCount: 6 });
    expect(row.previousReviews).toEqual([
      expect.objectContaining({ decision: 'REJECTED', note: 'Stock photos' }),
    ]);
  });

  it('falls back to updatedAt for listings queued before review tracking', async () => {
    const prisma = makePrisma();
    prisma.listing.findMany.mockResolvedValue([
      {
        ...base, id: 'legacy', needsReapproval: true,
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-09-09'),
        reviewRequests: [],
      },
    ]);
    const svc = build(prisma);

    const [row] = await svc.getPendingListings();

    expect(row.submittedAt).toEqual(new Date('2026-09-09'));
    expect(row.reviewType).toBe('REAPPROVAL');
    expect(row.diff).toBeNull();
  });
});
