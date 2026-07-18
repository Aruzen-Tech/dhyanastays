'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { Listing } from '../lib/types';
import {
  groupListingsForMap,
  type ListingMapGroup,
} from './listing-map-grouping';

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatLabel(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createPriceIcon(label: string, selected: boolean): L.DivIcon {
  const width = Math.min(120, Math.max(64, label.length * 8 + 24));

  return L.divIcon({
    className: 'price-map-marker-shell',
    html: `
      <span class="price-map-marker${selected ? ' price-map-marker--selected' : ''}">
        ${label}
      </span>
    `,
    iconSize: [width, 36],
    iconAnchor: [width / 2, 36],
    popupAnchor: [0, -38],
  });
}

function createClusterIcon(count: number, selected: boolean): L.DivIcon {
  const safeCount = Math.max(1, Math.trunc(count));
  const label = `${safeCount} stays`;
  const width = Math.min(96, Math.max(72, label.length * 7 + 22));

  return L.divIcon({
    className: 'price-map-cluster-shell',
    html: `
      <span class="price-map-cluster${selected ? ' price-map-cluster--selected' : ''}">
        ${label}
      </span>
    `,
    iconSize: [width, 36],
    iconAnchor: [width / 2, 36],
    popupAnchor: [0, -38],
  });
}

function BoundsWatcher({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function FitBounds({ listings }: { listings: Listing[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;

    const withCoords = listings.filter(
      (listing) =>
        listing.latitude != null && listing.longitude != null,
    );

    if (withCoords.length === 0) return;

    const bounds = L.latLngBounds(
      withCoords.map(
        (listing) =>
          [listing.latitude!, listing.longitude!] as [number, number],
      ),
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 12,
    });

    fitted.current = true;
  }, [listings, map]);

  return null;
}

function ListingPopupContent({ listing }: { listing: Listing }) {
  const rateRule = listing.rateRules?.[0];
  const rate = rateRule?.baseNightlyRate;
  const hasPrice = typeof rate === 'number' && rate > 0;
  const firstExperience = listing.experienceTags?.[0];

  return (
    <div className="min-w-[220px]">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
        {listing.propertyType
          ? formatLabel(listing.propertyType)
          : 'Dhyana Stay'}
      </div>

      <div className="mb-1 text-sm font-semibold leading-snug text-gray-900">
        {listing.title}
      </div>

      <div className="mb-2 text-xs text-gray-500">
        📍 {listing.city}, {listing.state}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
        {rateRule?.maxGuests && (
          <span>👥 Up to {rateRule.maxGuests}</span>
        )}

        {firstExperience && (
          <span>• {formatLabel(firstExperience)}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
        <div>
          {hasPrice ? (
            <>
              <span className="font-bold text-brand-700">
                {formatINR(rate)}
              </span>
              <span className="text-[11px] text-gray-400">
                {' '}
                / night
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-500">
              Price on request
            </span>
          )}
        </div>

        <Link
          href={`/listings/${listing.id}`}
          className="whitespace-nowrap text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          View stay &rarr;
        </Link>
      </div>
    </div>
  );
}

function ClusterPopupContent({
  listings,
  selectedId,
  onListingSelect,
}: {
  listings: Listing[];
  selectedId?: string | null;
  onListingSelect?: (listingId: string) => void;
}) {
  const initialFocusId =
    selectedId && listings.some((listing) => listing.id === selectedId)
      ? selectedId
      : listings[0]?.id;

  return (
    <div className="price-map-cluster-popup">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
        {listings.length} stays in this area
      </div>

      <div className="max-h-72 overflow-y-auto">
        <div className="space-y-2">
          {listings.map((listing) => {
            const rate = listing.rateRules?.[0]?.baseNightlyRate;
            const hasPrice = typeof rate === 'number' && rate > 0;
            const isSelected = listing.id === selectedId;

            return (
              <div
                key={listing.id}
                className={`price-map-cluster-popup-button${
                  isSelected ? ' price-map-cluster-popup-button--selected' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-left text-sm font-semibold leading-snug text-gray-900">
                    {listing.title}
                  </span>
                  <span className="mt-1 block text-left text-xs text-gray-500">
                    {listing.city}, {listing.state}
                  </span>
                  <span className="mt-1 block text-left text-xs font-medium text-brand-700">
                    {hasPrice ? formatINR(rate) : 'Price on request'}
                  </span>
                </div>

                <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    autoFocus={listing.id === initialFocusId}
                    onClick={() => onListingSelect?.(listing.id)}
                    className="price-map-cluster-popup-action"
                  >
                    {isSelected ? 'Selected' : 'Select stay'}
                  </button>

                  <Link
                    href={`/listings/${listing.id}`}
                    className="price-map-cluster-popup-link"
                  >
                    View stay &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SingleListingMarker({
  listing,
  selectedId,
  onListingSelect,
}: {
  listing: Listing;
  selectedId?: string | null;
  onListingSelect?: (listingId: string) => void;
}) {
  const rateRule = listing.rateRules?.[0];
  const rate = rateRule?.baseNightlyRate;
  const hasPrice = typeof rate === 'number' && rate > 0;
  const markerLabel = hasPrice ? formatINR(rate) : 'On request';
  const isSelected = listing.id === selectedId;

  return (
    <Marker
      position={[listing.latitude!, listing.longitude!]}
      icon={createPriceIcon(markerLabel, isSelected)}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => onListingSelect?.(listing.id),
      }}
    >
      <Popup>
        <ListingPopupContent listing={listing} />
      </Popup>
    </Marker>
  );
}

function ClusterGroupMarker({
  group,
  currentZoom,
  selectedId,
  onListingSelect,
}: {
  group: ListingMapGroup<Listing>;
  currentZoom: number;
  selectedId?: string | null;
  onListingSelect?: (listingId: string) => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const containsSelected = group.listings.some(
    (listing) => listing.id === selectedId,
  );
  const groupBounds = useMemo(
    () =>
      L.latLngBounds(
        group.listings.map((listing) => [
          listing.latitude!,
          listing.longitude!,
        ] as [number, number]),
      ),
    [group.listings],
  );
  const title = `${group.listings.length} stays in this area`;

  const handleClusterClick = () => {
    if (group.isExactCoordinateGroup) {
      markerRef.current?.openPopup();
      return;
    }

    const rawMaxZoom = map.getMaxZoom();
    const effectiveMaxZoom = Number.isFinite(rawMaxZoom)
      ? rawMaxZoom
      : currentZoom;
    const targetZoom = map.getBoundsZoom(
      groupBounds,
      false,
      L.point(40, 40),
    );

    if (
      Number.isFinite(targetZoom) &&
      targetZoom > currentZoom &&
      currentZoom < effectiveMaxZoom
    ) {
      map.fitBounds(groupBounds, {
        padding: [40, 40],
        maxZoom: effectiveMaxZoom,
      });
      return;
    }

    markerRef.current?.openPopup();
  };

  return (
    <Marker
      ref={markerRef}
      position={[
        group.displayCoordinate.latitude,
        group.displayCoordinate.longitude,
      ]}
      icon={createClusterIcon(group.listings.length, containsSelected)}
      zIndexOffset={containsSelected ? 1000 : 0}
      keyboard
      title={title}
      alt={title}
      eventHandlers={{
        click: handleClusterClick,
      }}
    >
      <Popup>
        <ClusterPopupContent
          listings={group.listings}
          selectedId={selectedId}
          onListingSelect={onListingSelect}
        />
      </Popup>
    </Marker>
  );
}

function ClusteredListingMarkers({
  listings,
  selectedId,
  onListingSelect,
}: {
  listings: Listing[];
  selectedId?: string | null;
  onListingSelect?: (listingId: string) => void;
}) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom());
    },
  });

  const groups = useMemo(
    () =>
      groupListingsForMap({
        listings,
        zoom: currentZoom,
        project: (listing) =>
          map.project(
            L.latLng(listing.latitude!, listing.longitude!),
            currentZoom,
          ),
      }),
    [listings, currentZoom, map],
  );

  return (
    <>
      {groups.map((group) => {
        if (group.listings.length === 1) {
          return (
            <SingleListingMarker
              key={group.groupId}
              listing={group.listings[0]}
              selectedId={selectedId}
              onListingSelect={onListingSelect}
            />
          );
        }

        return (
          <ClusterGroupMarker
            key={group.groupId}
            group={group}
            currentZoom={currentZoom}
            selectedId={selectedId}
            onListingSelect={onListingSelect}
          />
        );
      })}
    </>
  );
}

interface ListingMapProps {
  listings: Listing[];
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  onListingSelect?: (listingId: string) => void;
  selectedId?: string | null;
  height?: string;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
}

export default function ListingMap({
  listings,
  onBoundsChange,
  onListingSelect,
  selectedId,
  height = '500px',
  center = [20.5937, 78.9629],
  zoom = 5,
  interactive = true,
}: ListingMapProps) {
  const mappableListings = useMemo(
    () =>
      listings.filter(
        (listing) =>
          listing.latitude != null && listing.longitude != null,
      ),
    [listings],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{
        height,
        width: '100%',
        borderRadius: '0.75rem',
      }}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {onBoundsChange && (
        <BoundsWatcher onBoundsChange={onBoundsChange} />
      )}

      <FitBounds listings={listings} />
      <ClusteredListingMarkers
        listings={mappableListings}
        selectedId={selectedId}
        onListingSelect={onListingSelect}
      />
    </MapContainer>
  );
}
