'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { experiencesApi, formatINR } from '../../lib/api';
import type { Experience } from '../../lib/types';

export default function ExperiencesListPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<readonly string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    experiencesApi
      .getCategories()
      .then((r) => setCategories(r.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    experiencesApi
      .listPublic({
        category: filterCategory || undefined,
        city: filterCity || undefined,
      })
      .then(setExperiences)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterCategory, filterCity]);

  const hasFilter = filterCategory || filterCity.trim().length > 0;

  const empty = useMemo(
    () => !loading && experiences.length === 0,
    [loading, experiences],
  );

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="page-title">Wellness experiences</h1>
        <p className="text-gray-500 text-sm mt-1">
          Yoga classes, ayurveda sessions, guided hikes, and retreats hosted across India.
        </p>
      </div>

      <div className="card p-4 mb-6 space-y-4">
        <div>
          <label className="label">Filter by city</label>
          <input
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            placeholder="e.g. Rishikesh"
            className="input"
          />
        </div>

        <div>
          <label className="label mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterCategory('')}
              className={`px-3 py-1.5 text-xs rounded-full border ${
                filterCategory === ''
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-700'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 text-xs rounded-full border ${
                  filterCategory === c
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-700'
                }`}
              >
                {c.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {hasFilter && (
          <button
            onClick={() => {
              setFilterCategory('');
              setFilterCity('');
            }}
            className="text-xs text-brand-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : empty ? (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-2">🧘</div>
          <p className="text-sm">No experiences match. Try a different filter.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {experiences.map((e) => (
            <Link
              key={e.id}
              href={`/experiences/${e.id}`}
              className="card overflow-hidden hover:shadow-md transition-shadow"
            >
              {e.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.imageUrl} alt={e.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center text-5xl">
                  🧘
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-brand-700 uppercase tracking-wide font-medium">
                  {e.category.replace(/-/g, ' ')}
                </p>
                <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">{e.title}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {e.city}, {e.state}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-gray-500">
                    {new Date(e.startsAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="text-sm font-semibold text-brand-700">
                    {formatINR(e.priceMinor)}
                  </span>
                </div>
                {typeof e.seatsAvailable === 'number' && (
                  <p className="text-xs text-gray-400 mt-2">
                    {e.seatsAvailable} seat{e.seatsAvailable === 1 ? '' : 's'} available
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
