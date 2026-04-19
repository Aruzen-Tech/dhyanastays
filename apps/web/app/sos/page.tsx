'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sosApi, type SosIncident, type SosTier } from '../../lib/api';

const TIERS: { value: SosTier; label: string; desc: string; color: string }[] = [
  { value: 'MEDICAL', label: 'Medical', desc: 'Illness, injury, allergy, breathing trouble', color: 'bg-red-600' },
  { value: 'SECURITY', label: 'Security', desc: 'Threat, intruder, feeling unsafe', color: 'bg-orange-600' },
  { value: 'TRANSPORT', label: 'Transport', desc: 'Stranded, accident, lost', color: 'bg-amber-600' },
  { value: 'OTHER', label: 'Other', desc: 'Any emergency not covered above', color: 'bg-gray-700' },
];

export default function SosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const bookingId = search.get('bookingId') ?? undefined;

  const [tier, setTier] = useState<SosTier | null>(null);
  const [message, setMessage] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [incident, setIncident] = useState<SosIncident | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

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
      setIncident(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send SOS');
    } finally {
      setSubmitting(false);
    }
  };

  if (incident) {
    return (
      <div className="container-page py-12 max-w-xl mx-auto">
        <div className="card p-8 text-center border-2 border-red-200 bg-red-50">
          <div className="text-5xl mb-3">🆘</div>
          <h1 className="text-2xl font-semibold text-red-700 mb-2">
            Help is on the way
          </h1>
          <p className="text-sm text-gray-700">
            We have notified our on-duty ops team and your trusted contacts. Stay
            where you are if safe; someone will reach out shortly.
          </p>
          <div className="mt-6 text-xs text-gray-500">
            Incident <span className="font-mono">{incident.id.slice(0, 10)}…</span>
          </div>
          <Link href="/dashboard" className="btn-primary mt-6 inline-block">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

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
    </div>
  );
}
