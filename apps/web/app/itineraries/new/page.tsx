'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { itinerariesApi } from '../../../lib/api';

const INTEREST_OPTIONS = [
  'yoga',
  'meditation',
  'ayurveda',
  'detox',
  'hiking',
  'local cuisine',
  'sound healing',
  'nature',
  'cultural tours',
  'spa',
];

export default function NewItineraryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    destination: '',
    startsAt: '',
    endsAt: '',
    travelers: 2,
    interests: [] as string[],
    budgetRupees: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const toggleInterest = (i: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await itinerariesApi.generate({
        destination: form.destination,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        travelers: Number(form.travelers),
        interests: form.interests.length ? form.interests : undefined,
        budgetMinor: form.budgetRupees > 0 ? Math.round(form.budgetRupees * 100) : undefined,
      });
      router.push(`/itineraries/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-10 max-w-xl mx-auto">
      <Link href="/itineraries" className="btn-ghost text-sm mb-4 inline-block">
        ← Back
      </Link>
      <h1 className="page-title mb-2">Generate an itinerary</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tell us about your trip and we&apos;ll draft a day-by-day wellness plan.
      </p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Destination</label>
          <input
            required
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="input"
            placeholder="Rishikesh"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start date</label>
            <input
              type="date"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">End date</label>
            <input
              type="date"
              required
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Travelers</label>
            <input
              type="number"
              min={1}
              max={20}
              required
              value={form.travelers}
              onChange={(e) => setForm({ ...form, travelers: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Budget per person (₹, optional)</label>
            <input
              type="number"
              min={0}
              value={form.budgetRupees}
              onChange={(e) => setForm({ ...form, budgetRupees: Number(e.target.value) })}
              className="input"
              placeholder="15000"
            />
          </div>
        </div>

        <div>
          <label className="label">Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                className={`px-3 py-1.5 text-xs rounded-full border ${
                  form.interests.includes(i)
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <span className="spinner" /> : 'Generate itinerary'}
        </button>
        <p className="text-xs text-gray-400">
          Generation takes about 10–20 seconds. Max 21-day trips.
        </p>
      </form>
    </div>
  );
}
