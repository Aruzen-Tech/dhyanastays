'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { passportApi, type Passport, type PassportStamp } from '../../lib/api';

// Theme → accent colour (mirrors the backend palette primaries).
const THEME_COLOR: Record<string, string> = {
  forest_villa: '#0F6E56',
  heritage: '#B4791F',
  beachfront: '#1466A6',
  treehouse: '#2F7D32',
  retreat: '#6A4CA6',
  farm_stay: '#C25B3F',
};
const colorFor = (themeId: string) => THEME_COLOR[themeId] ?? '#0F6E56';

function StampMedallion({ stamp }: { stamp: PassportStamp }) {
  const color = colorFor(stamp.themeId);
  const sealed = stamp.state === 'SEALED';
  const entry = stamp.state === 'ENTRY';

  return (
    <div className="card p-5 flex flex-col items-center text-center relative overflow-hidden">
      {/* faint themed wash */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}, transparent 70%)` }}
      />
      {/* the stamp */}
      <div
        className="relative w-24 h-24 rounded-full flex items-center justify-center mb-3"
        style={{
          border: `2.5px ${sealed ? 'solid' : 'dashed'} ${color}`,
          background: sealed ? `${color}14` : 'transparent',
          transform: 'rotate(-6deg)',
        }}
      >
        <div className="text-center leading-tight" style={{ color }}>
          <div className="text-[9px] font-semibold tracking-widest uppercase">Dhyana</div>
          <div className="text-[10px] font-bold px-2 line-clamp-2">{stamp.theme}</div>
          <div className="text-[8px] mt-0.5 opacity-80">
            {new Date(stamp.stayStart).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
          </div>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        {stamp.propertyName}
      </h3>
      <p className="text-gray-500 text-xs mt-0.5">{stamp.city}</p>
      <p className="text-gray-400 text-xs mt-1">{stamp.memoryLine}</p>

      <span
        className="mt-3 text-[10px] font-semibold px-2.5 py-1 rounded-full"
        style={
          sealed
            ? { background: `${color}1A`, color }
            : { background: 'rgba(120,112,98,0.12)', color: 'rgb(120,112,98)' }
        }
      >
        {sealed ? '✓ Stay sealed' : entry ? '● Checked in' : 'Upcoming'}
      </span>
    </div>
  );
}

export default function PassportPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (!user) return;
    passportApi
      .get()
      .then(setPassport)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  const p = passport!;
  const circuit = p.collections[0];

  return (
    <div className="container-page py-8 space-y-8 animate-fade-in">
      {/* Passport cover header */}
      <header className="relative rounded-3xl overflow-hidden">
        <div className="bg-brand-700 text-white px-8 py-10">
          <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Dhyana Stays
          </p>
          <h1 className="text-3xl mt-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Your Stay Passport
          </h1>
          <p className="text-white/80 text-sm mt-2 max-w-lg">
            A stamp for every sanctuary you visit — inked at check-in, sealed when your stay is complete.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-md">
            {[
              { label: 'Stamps', value: p.stats.totalStamps },
              { label: 'Nights', value: p.stats.totalNights },
              { label: 'Sanctuaries', value: p.stats.distinctThemes },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-white/70 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Collection progress */}
      {circuit && (
        <section className="card p-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {circuit.name}
              </h2>
              <p className="text-gray-500 text-sm">{circuit.description}</p>
            </div>
            <span className="text-sm font-semibold text-brand-700">
              {circuit.collected} / {circuit.required}
              {circuit.complete && <span className="text-gold"> · Complete ✦</span>}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-700 transition-all"
              style={{ width: `${(circuit.collected / circuit.required) * 100}%` }}
            />
          </div>
          {circuit.missing.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              Still to visit: {circuit.missing.map((m) => m.displayName).join(' · ')}
            </p>
          )}
        </section>
      )}

      {/* Stamp spread */}
      {p.stamps.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🛂</div>
          <h3 className="font-semibold text-gray-700">Your passport is waiting for its first stamp</h3>
          <p className="text-gray-400 text-sm mt-1">
            Complete a stay and your first sanctuary stamp will appear here.
          </p>
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Your stamps
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {p.stamps.map((s) => (
              <StampMedallion key={s.id} stamp={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
