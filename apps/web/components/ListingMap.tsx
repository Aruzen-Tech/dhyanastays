'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Listing } from '../lib/types';

// Fix Leaflet default marker icons in Next.js (webpack strips asset paths)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// ── Format price helper ──────────────────────────────────────────────────────
function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

// ── Bounds change handler ────────────────────────────────────────────────────
function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Fit bounds to markers ────────────────────────────────────────────────────
function FitBounds({ listings }: { listings: Listing[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const withCoords = listings.filter((l) => l.latitude && l.longitude);
    if (withCoords.length === 0) return;

    const bounds = L.latLngBounds(
      withCoords.map((l) => [l.latitude!, l.longitude!] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    fitted.current = true;
  }, [listings, map]);

  return null;
}

// ── Main Component ───────────────────────────────────────────────────────────
interface ListingMapProps {
  listings: Listing[];
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  selectedId?: string | null;
  height?: string;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
}

export default function ListingMap({
  listings,
  onBoundsChange,
  selectedId,
  height = '500px',
  center = [20.5937, 78.9629], // India center
  zoom = 5,
  interactive = true,
}: ListingMapProps) {
  const mappableListings = useMemo(
    () => listings.filter((l) => l.latitude && l.longitude),
    [listings],
  );

  const selectedIcon = useMemo(
    () =>
      L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [30, 49],
        iconAnchor: [15, 49],
        popupAnchor: [1, -40],
        shadowSize: [49, 49],
        className: 'marker-selected',
      }),
    [],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {onBoundsChange && <BoundsWatcher onBoundsChange={onBoundsChange} />}
      <FitBounds listings={listings} />

      {mappableListings.map((listing) => {
        const rate = listing.rateRules?.[0]?.baseNightlyRate;
        const isSelected = listing.id === selectedId;

        return (
          <Marker
            key={listing.id}
            position={[listing.latitude!, listing.longitude!]}
            icon={isSelected ? selectedIcon : defaultIcon}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-semibold text-sm mb-1">{listing.title}</h3>
                <p className="text-xs text-gray-500 mb-1">
                  {listing.city}, {listing.state}
                </p>
                {rate && (
                  <p className="text-sm font-medium text-brand-700 mb-2">
                    {formatINR(rate)}/night
                  </p>
                )}
                <Link
                  href={`/listings/${listing.id}`}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                >
                  View Details &rarr;
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
