'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { itinerariesApi } from '../../../lib/api';
import type { ItinerarySuggestion } from '../../../lib/types';

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

type Step = 'form' | 'suggestions';

export default function NewItineraryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({
    destination: '',
    startsAt: '',
    endsAt: '',
    travelers: 2,
    interests: [] as string[],
    budgetRupees: 0,
  });
  const [suggestions, setSuggestions] = useState<ItinerarySuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  const buildBaseBody = () => ({
    destination: form.destination,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    travelers: Number(form.travelers),
    interests: form.interests.length ? form.interests : undefined,
    budgetMinor: form.budgetRupees > 0 ? Math.round(form.budgetRupees * 100) : undefined,
  });

  const handleGetSuggestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuggesting(true);
    try {
      const result = await itinerariesApi.suggest(buildBaseBody());
      setSuggestions(result.suggestions);
      setStep('suggestions');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load suggestions');
    } finally {
      setSuggesting(false);
    }
  };

  const handleGenerate = async (themeHint?: string) => {
    setError('');
    setGenerating(true);
    try {
      const created = await itinerariesApi.generate({
        ...buildBaseBody(),
        themeHint,
      });
      router.push(`/itineraries/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-xl mx-auto">
      <Link href="/itineraries" className="btn-ghost text-sm mb-4 inline-block">
        ← Back
      </Link>

      {step === 'form' && (
        <>
          <h1 className="page-title mb-2">Plan your retreat</h1>
          <p className="text-sm text-gray-500 mb-6">
            Step 1 of 3: tell us about your trip and we&apos;ll suggest a few concept ideas
            before drafting the full plan.
          </p>

          <form onSubmit={handleGetSuggestions} className="card p-6 space-y-4">
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
                  title="Trip start date"
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
                  title="Trip end date"
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
                  title="Number of travelers"
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
                  onChange={(e) =>
                    setForm({ ...form, budgetRupees: Number(e.target.value) })
                  }
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

            <button
              type="submit"
              disabled={suggesting || generating}
              className="btn-primary w-full"
            >
              {suggesting ? (
                <span className="spinner" />
              ) : (
                'See concept suggestions →'
              )}
            </button>
            <p className="text-xs text-gray-400">
              Suggestions are quick (5–10s). You&apos;ll pick one and we&apos;ll generate the
              full day-by-day plan. Max 21-day trips.
            </p>
          </form>
        </>
      )}

      {step === 'suggestions' && (
        <>
          <h1 className="page-title mb-2">Pick a concept</h1>
          <p className="text-sm text-gray-500 mb-6">
            Step 2 of 3: choose the theme that resonates. We&apos;ll generate the full
            day-by-day plan from there. You can refine it through chat afterwards.
          </p>

          <div className="space-y-3 mb-4">
            {suggestions.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleGenerate(s.title)}
                disabled={generating}
                className="card p-5 w-full text-left hover:border-brand-700 hover:shadow-md transition disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 uppercase tracking-wide">
                    {s.theme}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{s.summary}</p>
                <p className="text-xs text-brand-700 mt-3">Generate this plan →</p>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleGenerate(undefined)}
              disabled={generating}
              className="btn-ghost flex-1"
            >
              {generating ? (
                <span className="spinner" />
              ) : (
                'Skip — generate anything'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setSuggestions([]);
              }}
              disabled={generating}
              className="btn-ghost"
            >
              ← Edit trip details
            </button>
          </div>

          {generating && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Drafting your plan… usually 10–20 seconds.
            </p>
          )}
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </>
      )}
    </div>
  );
}
