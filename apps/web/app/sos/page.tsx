'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { sosApi, type SosIncident, type SosTier } from '../../lib/api';

const ACTIVE_STATUSES = new Set(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS']);

const TIERS: { value: SosTier; label: string; desc: string; color: string }[] = [
  { value: 'MEDICAL', label: 'Medical', desc: 'Illness, injury, allergy, breathing trouble', color: 'bg-red-600' },
  { value: 'SECURITY', label: 'Security', desc: 'Threat, intruder, feeling unsafe', color: 'bg-orange-600' },
  { value: 'TRANSPORT', label: 'Transport', desc: 'Stranded, accident, lost', color: 'bg-amber-600' },
  { value: 'OTHER', label: 'Other', desc: 'Any emergency not covered above', color: 'bg-gray-700' },
];

// useSearchParams() requires a Suspense boundary for static prerender.
export default function SosPage() {
  return (
    <Suspense>
      <SosPageInner />
    </Suspense>
  );
}

function SosPageInner() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const bookingId = search.get('bookingId') ?? undefined;

  const [tier, setTier] = useState<SosTier | null>(null);
  const [message, setMessage] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeIncidents, setActiveIncidents] = useState<SosIncident[]>([]);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  // Load existing active incidents so the guest doesn't double-trigger.
  useEffect(() => {
    if (!user) return;
    sosApi
      .listMine()
      .then((all) => setActiveIncidents(all.filter((i) => ACTIVE_STATUSES.has(i.status))))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Location unavailable on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (e) => setGeoError(e.message),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, []);

  const submit = async () => {
    if (!tier || !geo) return;
    setError('');
    setSubmitting(true);
    try {
      const created = await sosApi.trigger({
        tier,
        lat: geo.lat,
        lng: geo.lng,
        message: message || undefined,
        bookingId,
      });
      // Land on the live incident console — chat + status timeline + call support.
      router.push(`/sos/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send SOS');
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-10 max-w-xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title text-red-700">Emergency SOS</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tap a category to alert our on-duty team and your trusted contacts.
        </p>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Active-incident callout — most common reason a guest revisits /sos */}
      {activeIncidents.length > 0 && (
        <div className="card p-4 mb-4 border-2 border-red-200 bg-red-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="spinner text-red-600" aria-label="Live" />
                <h2 className="font-semibold text-red-800 text-sm">
                  You have {activeIncidents.length} active alert
                  {activeIncidents.length === 1 ? '' : 's'}
                </h2>
              </div>
              <p className="text-xs text-red-700">
                Open the console to chat with support, check status, or call directly.
              </p>
            </div>
            <Link
              href={`/sos/${activeIncidents[0].id}`}
              className="btn-primary bg-red-600 hover:bg-red-700 text-xs whitespace-nowrap"
            >
              Open console →
            </Link>
          </div>
          {activeIncidents.length > 1 && (
            <Link
              href="/guest/sos"
              className="text-xs text-red-700 underline mt-2 inline-block"
            >
              See all {activeIncidents.length} active alerts
            </Link>
          )}
        </div>
      )}

      <section className="card p-4 mb-4 bg-gray-50 text-sm">
        {geo ? (
          <span className="text-gray-600">
            📍 Location locked: {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
          </span>
        ) : geoError ? (
          <span className="text-red-600">⚠ {geoError} — please enable location.</span>
        ) : (
          <span className="text-gray-500">Acquiring location…</span>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {TIERS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTier(t.value)}
            className={`p-4 rounded-2xl text-white text-left transition-transform ${
              t.color
            } ${tier === t.value ? 'ring-4 ring-offset-2 ring-red-400 scale-[1.02]' : 'opacity-90 hover:opacity-100'}`}
          >
            <div className="font-semibold">{t.label}</div>
            <div className="text-xs opacity-90 mt-1">{t.desc}</div>
          </button>
        ))}
      </div>

      <textarea
        className="input w-full mb-4"
        rows={3}
        placeholder="What is happening? (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={!tier || !geo || submitting}
        className="w-full py-4 rounded-2xl bg-red-600 text-white font-semibold text-lg disabled:opacity-40 hover:bg-red-700"
      >
        {submitting ? 'Sending…' : 'Send SOS now'}
      </button>

      <p className="text-xs text-gray-400 mt-4 text-center">
        False alarms should be resolved from the incident page so ops can stand
        down. Rate limit: 5 requests per minute.
      </p>
      <div className="text-center mt-3">
        <Link href="/guest/sos" className="text-xs text-gray-500 hover:text-brand-700">
          View SOS history →
        </Link>
      </div>
    </div>
  );
}
