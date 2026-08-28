'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

/** A teardrop pin (divIcon avoids Leaflet's broken default-marker asset paths). */
const PIN_ICON = L.divIcon({
  className: 'location-picker-pin',
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.4 25.3 14 26 .5.6 1.5.6 2 0 .6-.7 14-15.5 14-26C30 6.7 23.3 0 15 0z" fill="#4b5d3a"/>
    <circle cx="15" cy="15" r="6" fill="#fff"/>
  </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

/** Drops/moves the pin when the host clicks anywhere on the map. */
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/**
 * Once, on first mount with no coordinates yet, geocode "city, state, India"
 * (free OpenStreetMap Nominatim) and centre the map there so the host isn't
 * staring at all of India. Never drops a pin — the host places that.
 */
function GeocodeCenter({ city, state, hasPos }: { city?: string; state?: string; hasPos: boolean }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || hasPos) return;
    const q = [city, state, 'India'].filter(Boolean).join(', ').trim();
    if (!q) return;
    done.current = true;
    let alive = true;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((results: Array<{ lat: string; lon: string }>) => {
        if (!alive || !results?.[0]) return;
        map.setView([Number(results[0].lat), Number(results[0].lon)], 12);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [city, state, hasPos, map]);

  return null;
}

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  city?: string;
  state?: string;
  height?: string;
}

export default function LocationPicker({ lat, lng, onChange, city, state, height = '320px' }: Props) {
  const hasPos = lat != null && lng != null;
  const center: [number, number] = hasPos ? [lat as number, lng as number] : INDIA_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={hasPos ? 14 : 5}
      style={{ height, width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onChange} />
      <GeocodeCenter city={city} state={state} hasPos={hasPos} />
      {hasPos && (
        <Marker
          position={[lat as number, lng as number]}
          icon={PIN_ICON}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
