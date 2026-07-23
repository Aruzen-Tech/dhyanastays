import type { Listing } from '../lib/types';

export const MAP_CLUSTER_THRESHOLD_PX = 72;
export const MAP_CLUSTER_BUCKET_SIZE_PX = 72;

export type GroupableListing = Pick<
  Listing,
  'id' | 'latitude' | 'longitude'
>;

export type ProjectedPoint = {
  x: number;
  y: number;
};

export type ListingMapGroupInput<T extends GroupableListing> = {
  listings: T[];
  zoom: number;
  project: (listing: T) => ProjectedPoint;
};

export type ListingMapGroup<T extends GroupableListing> = {
  groupId: string;
  listings: T[];
  zoom: number;
  isExactCoordinateGroup: boolean;
  displayCoordinate: {
    latitude: number;
    longitude: number;
  };
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
};

type ValidCoordinateListing<T extends GroupableListing> = T & {
  latitude: number;
  longitude: number;
};

type IndexedListing<T extends GroupableListing> = {
  listing: T;
  sortedIndex: number;
  latitude: number;
  longitude: number;
  projectedPoint: ProjectedPoint;
  bucketX: number;
  bucketY: number;
};

function hasFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function distanceBetween(a: ProjectedPoint, b: ProjectedPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

class UnionFind {
  private readonly parent: number[];
  private readonly rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = Array.from({ length: size }, () => 0);
  }

  find(index: number): number {
    if (this.parent[index] !== index) {
      this.parent[index] = this.find(this.parent[index]);
    }

    return this.parent[index];
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) return;

    const rankA = this.rank[rootA];
    const rankB = this.rank[rootB];

    if (rankA < rankB) {
      this.parent[rootA] = rootB;
      return;
    }

    if (rankA > rankB) {
      this.parent[rootB] = rootA;
      return;
    }

    const stableRoot = rootA < rootB ? rootA : rootB;
    const otherRoot = stableRoot === rootA ? rootB : rootA;

    this.parent[otherRoot] = stableRoot;
    this.rank[stableRoot] += 1;
  }
}

function buildDeterministicGroup<T extends GroupableListing>(
  members: IndexedListing<T>[],
  zoom: number,
): ListingMapGroup<T> {
  const listings = [...members]
    .sort((a, b) => a.listing.id.localeCompare(b.listing.id))
    .map((member) => member.listing);

  const sortedIds = listings.map((listing) => listing.id);
  const groupId = `z${zoom}:${sortedIds.join(',')}`;

  let south = members[0].latitude;
  let west = members[0].longitude;
  let north = members[0].latitude;
  let east = members[0].longitude;

  let minProjectedX = members[0].projectedPoint.x;
  let maxProjectedX = members[0].projectedPoint.x;
  let minProjectedY = members[0].projectedPoint.y;
  let maxProjectedY = members[0].projectedPoint.y;

  const first = members[0];
  let isExactCoordinateGroup = true;

  for (const member of members) {
    south = Math.min(south, member.latitude);
    west = Math.min(west, member.longitude);
    north = Math.max(north, member.latitude);
    east = Math.max(east, member.longitude);

    minProjectedX = Math.min(minProjectedX, member.projectedPoint.x);
    maxProjectedX = Math.max(maxProjectedX, member.projectedPoint.x);
    minProjectedY = Math.min(minProjectedY, member.projectedPoint.y);
    maxProjectedY = Math.max(maxProjectedY, member.projectedPoint.y);

    if (
      member.latitude !== first.latitude ||
      member.longitude !== first.longitude
    ) {
      isExactCoordinateGroup = false;
    }
  }

  let displayLatitude = first.latitude;
  let displayLongitude = first.longitude;

  if (!isExactCoordinateGroup) {
    const centerX = (minProjectedX + maxProjectedX) / 2;
    const centerY = (minProjectedY + maxProjectedY) / 2;
    let bestMember = members[0];
    let bestDistance = distanceBetween(bestMember.projectedPoint, {
      x: centerX,
      y: centerY,
    });

    for (let index = 1; index < members.length; index += 1) {
      const member = members[index];
      const nextDistance = distanceBetween(member.projectedPoint, {
        x: centerX,
        y: centerY,
      });

      if (
        nextDistance < bestDistance ||
        (nextDistance === bestDistance &&
          member.listing.id.localeCompare(bestMember.listing.id) < 0)
      ) {
        bestMember = member;
        bestDistance = nextDistance;
      }
    }

    displayLatitude = bestMember.latitude;
    displayLongitude = bestMember.longitude;
  }

  return {
    groupId,
    listings,
    zoom,
    isExactCoordinateGroup,
    displayCoordinate: {
      latitude: displayLatitude,
      longitude: displayLongitude,
    },
    bounds: {
      south,
      west,
      north,
      east,
    },
  };
}

export function groupListingsForMap<T extends GroupableListing>({
  listings,
  zoom,
  project,
}: ListingMapGroupInput<T>): ListingMapGroup<T>[] {
  const validListings: IndexedListing<T>[] = listings
    .filter(
      (listing): listing is ValidCoordinateListing<T> =>
        hasFiniteCoordinate(listing.latitude) &&
        hasFiniteCoordinate(listing.longitude),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((listing, sortedIndex) => {
      const projectedPoint = project(listing);

      return {
        listing,
        sortedIndex,
        latitude: listing.latitude,
        longitude: listing.longitude,
        projectedPoint,
        bucketX: Math.floor(projectedPoint.x / MAP_CLUSTER_BUCKET_SIZE_PX),
        bucketY: Math.floor(projectedPoint.y / MAP_CLUSTER_BUCKET_SIZE_PX),
      };
    });

  if (validListings.length === 0) return [];

  const unionFind = new UnionFind(validListings.length);
  const bucketMap = new Map<string, number[]>();

  for (const member of validListings) {
    const bucketKey = `${member.bucketX}:${member.bucketY}`;
    const bucketMembers = bucketMap.get(bucketKey);

    if (bucketMembers) {
      bucketMembers.push(member.sortedIndex);
    } else {
      bucketMap.set(bucketKey, [member.sortedIndex]);
    }
  }

  for (const member of validListings) {
    for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        const bucketKey = `${member.bucketX + deltaX}:${member.bucketY + deltaY}`;
        const neighborIndexes = bucketMap.get(bucketKey);

        if (!neighborIndexes) continue;

        for (const neighborIndex of neighborIndexes) {
          if (neighborIndex >= member.sortedIndex) continue;

          const neighbor = validListings[neighborIndex];

          if (
            distanceBetween(member.projectedPoint, neighbor.projectedPoint) <=
            MAP_CLUSTER_THRESHOLD_PX
          ) {
            unionFind.union(member.sortedIndex, neighborIndex);
          }
        }
      }
    }
  }

  const groupedMembers = new Map<number, IndexedListing<T>[]>();

  for (const member of validListings) {
    const root = unionFind.find(member.sortedIndex);
    const rootMembers = groupedMembers.get(root);

    if (rootMembers) {
      rootMembers.push(member);
    } else {
      groupedMembers.set(root, [member]);
    }
  }

  return [...groupedMembers.values()]
    .map((members) => buildDeterministicGroup(members, zoom))
    .sort((a, b) => a.listings[0].id.localeCompare(b.listings[0].id));
}
