import { describe, expect, it } from 'vitest';
import type { GroupableListing, ProjectedPoint } from './listing-map-grouping';
import { groupListingsForMap } from './listing-map-grouping';

type TestListing = GroupableListing & {
  title?: string;
};

function buildListing(
  id: string,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): TestListing {
  return {
    id,
    latitude,
    longitude,
  };
}

describe('groupListingsForMap', () => {
  it('returns zero groups for empty input', () => {
    const groups = groupListingsForMap<TestListing>({
      listings: [],
      zoom: 9,
      project: () => ({ x: 0, y: 0 }),
    });

    expect(groups).toEqual([]);
  });

  it('ignores invalid coordinates and keeps valid listings', () => {
    const projectionById: Record<string, ProjectedPoint> = {
      valid: { x: 10, y: 20 },
    };

    const groups = groupListingsForMap<TestListing>({
      listings: [
        buildListing('missing-lat', undefined, 77),
        buildListing('missing-lng', 28, undefined),
        buildListing('nan-lat', Number.NaN, 77),
        buildListing('infinite-lng', 28, Number.POSITIVE_INFINITY),
        buildListing('valid', 28.61, 77.21),
      ],
      zoom: 8,
      project: (listing) => projectionById[listing.id],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('z8:valid');
    expect(groups[0].listings.map((listing) => listing.id)).toEqual(['valid']);
  });

  it('creates one group for a single valid listing', () => {
    const listing = buildListing('solo', 28.61, 77.21);

    const groups = groupListingsForMap<TestListing>({
      listings: [listing],
      zoom: 12,
      project: () => ({ x: 120, y: 240 }),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('z12:solo');
    expect(groups[0].listings).toEqual([listing]);
  });

  it('groups exact duplicate coordinates together', () => {
    const first = buildListing('alpha', 28.61, 77.21);
    const second = buildListing('beta', 28.61, 77.21);

    const groups = groupListingsForMap<TestListing>({
      listings: [second, first],
      zoom: 11,
      project: () => ({ x: 320, y: 160 }),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('z11:alpha,beta');
    expect(groups[0].isExactCoordinateGroup).toBe(true);
    expect(groups[0].listings.map((listing) => listing.id)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('groups nearby listings across adjacent spatial buckets', () => {
    const projectionById: Record<string, ProjectedPoint> = {
      alpha: { x: 71, y: 71 },
      beta: { x: 72, y: 72 },
    };

    const groups = groupListingsForMap<TestListing>({
      listings: [
        buildListing('beta', 28.6005, 77.2005),
        buildListing('alpha', 28.6, 77.2),
      ],
      zoom: 10,
      project: (listing) => projectionById[listing.id],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('z10:alpha,beta');
    expect(groups[0].isExactCoordinateGroup).toBe(false);
  });

  it('keeps beyond-threshold listings separate', () => {
    const projectionById: Record<string, ProjectedPoint> = {
      alpha: { x: 0, y: 0 },
      beta: { x: 73, y: 0 },
    };

    const groups = groupListingsForMap<TestListing>({
      listings: [
        buildListing('alpha', 28.6, 77.2),
        buildListing('beta', 28.6009, 77.2009),
      ],
      zoom: 10,
      project: (listing) => projectionById[listing.id],
    });

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.groupId)).toEqual([
      'z10:alpha',
      'z10:beta',
    ]);
  });

  it('groups listings that are exactly at the 72px threshold', () => {
    const projectionById: Record<string, ProjectedPoint> = {
      alpha: { x: 0, y: 0 },
      beta: { x: 72, y: 0 },
    };

    const groups = groupListingsForMap<TestListing>({
      listings: [
        buildListing('beta', 28.601, 77.201),
        buildListing('alpha', 28.6, 77.2),
      ],
      zoom: 10,
      project: (listing) => projectionById[listing.id],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('z10:alpha,beta');
    expect(groups[0].listings.map((listing) => listing.id)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('merges connected chains into one deterministic component', () => {
    const projectionById: Record<string, ProjectedPoint> = {
      alpha: { x: 0, y: 0 },
      beta: { x: 60, y: 0 },
      gamma: { x: 120, y: 0 },
    };

    const groups = groupListingsForMap<TestListing>({
      listings: [
        buildListing('gamma', 28.602, 77.202),
        buildListing('alpha', 28.6, 77.2),
        buildListing('beta', 28.601, 77.201),
      ],
      zoom: 13,
      project: (listing) => projectionById[listing.id],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('z13:alpha,beta,gamma');
    expect(groups[0].listings.map((listing) => listing.id)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('merges a longer transitive chain into one connected component', () => {
    const listings = Array.from({ length: 20 }, (_, index) =>
      buildListing(
        `stay-${String(index + 1).padStart(2, '0')}`,
        28.6 + index * 0.001,
        77.2 + index * 0.001,
      ),
    );

    const groups = groupListingsForMap<TestListing>({
      listings: [...listings].reverse(),
      zoom: 12,
      project: (listing) => {
        const index = Number.parseInt(listing.id.slice(-2), 10) - 1;
        return { x: index * 60, y: 0 };
      },
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe(
      `z12:${listings.map((listing) => listing.id).join(',')}`,
    );
    expect(groups[0].listings.map((listing) => listing.id)).toEqual(
      listings.map((listing) => listing.id),
    );
  });

  it('returns identical group ordering, member ordering, and ids for shuffled input', () => {
    const listings = [
      buildListing('charlie', 28.603, 77.203),
      buildListing('alpha', 28.6, 77.2),
      buildListing('delta', 29, 78),
      buildListing('bravo', 28.6005, 77.2005),
    ];

    const projectionById: Record<string, ProjectedPoint> = {
      alpha: { x: 0, y: 0 },
      bravo: { x: 20, y: 10 },
      charlie: { x: 200, y: 0 },
      delta: { x: 500, y: 500 },
    };

    const first = groupListingsForMap<TestListing>({
      listings,
      zoom: 7,
      project: (listing) => projectionById[listing.id],
    });

    const second = groupListingsForMap<TestListing>({
      listings: [listings[2], listings[0], listings[3], listings[1]],
      zoom: 7,
      project: (listing) => projectionById[listing.id],
    });

    expect(second).toEqual(first);
  });

  it('builds stable group ids from zoom and sorted listing ids', () => {
    const groups = groupListingsForMap<TestListing>({
      listings: [
        buildListing('stay-c', 28.602, 77.202),
        buildListing('stay-a', 28.6, 77.2),
        buildListing('stay-b', 28.601, 77.201),
      ],
      zoom: 15,
      project: () => ({ x: 40, y: 40 }),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('z15:stay-a,stay-b,stay-c');
  });

  it('creates one deterministic exact-coordinate cluster for 200 listings', () => {
    const listings = Array.from({ length: 200 }, (_, index) =>
      buildListing(
        `stay-${String(index + 1).padStart(3, '0')}`,
        28.61,
        77.21,
      ),
    );

    const groups = groupListingsForMap<TestListing>({
      listings: [...listings].reverse(),
      zoom: 14,
      project: () => ({ x: 320, y: 160 }),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].isExactCoordinateGroup).toBe(true);
    expect(groups[0].listings).toHaveLength(200);
    expect(groups[0].listings.map((listing) => listing.id)).toEqual(
      listings.map((listing) => listing.id),
    );
    expect(groups[0].groupId).toBe(
      `z14:${listings.map((listing) => listing.id).join(',')}`,
    );
  });
});
