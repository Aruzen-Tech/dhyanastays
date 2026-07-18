'use client';

import { useEffect, useMemo, useRef } from 'react';
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

      {mappableListings.map((listing) => {
        const rateRule = listing.rateRules?.[0];
        const rate = rateRule?.baseNightlyRate;
        const hasPrice = typeof rate === 'number' && rate > 0;
        const markerLabel = hasPrice ? formatINR(rate) : 'On request';
        const isSelected = listing.id === selectedId;
        const firstExperience = listing.experienceTags?.[0];

        return (
          <Marker
            key={listing.id}
            position={[listing.latitude!, listing.longitude!]}
            icon={createPriceIcon(markerLabel, isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{
              click: () => onListingSelect?.(listing.id),
            }}
          >
            <Popup>
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
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
