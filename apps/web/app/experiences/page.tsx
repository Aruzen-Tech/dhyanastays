'use client';

import { useEffect, useMemo, useState } from 'react';
import { experiencesApi } from '../../lib/api';
import type { Experience } from '../../lib/types';
import ExperienceHero from '../../components/experiences/ExperienceHero';
import ExperienceFilters from '../../components/experiences/ExperienceFilters';
import ExperienceCard from '../../components/experiences/ExperienceCard';
import ExperienceSkeletonGrid from '../../components/experiences/ExperienceSkeletonGrid';
import ExperienceEmptyState from '../../components/experiences/ExperienceEmptyState';
import ExperienceErrorState from '../../components/experiences/ExperienceErrorState';

export default function ExperiencesListPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<readonly string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Lets the restyled error state's "Try again" re-run the exact same fetch
  // below (no new endpoint/logic — just a dependency bump on the existing
  // effect, the same pattern app/page.tsx already uses for its own retry).
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    experiencesApi
      .getCategories()
      .then((r) => setCategories(r.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    experiencesApi
      .listPublic({
        category: filterCategory || undefined,
        city: filterCity || undefined,
      })
      .then(setExperiences)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterCategory, filterCity, retryTick]);

  const hasFilter = filterCategory || filterCity.trim().length > 0;

  const empty = useMemo(
    () => !loading && !error && experiences.length === 0,
    [loading, error, experiences],
  );

  const clearFilters = () => {
    setFilterCategory('');
    setFilterCity('');
  };

  return (
    <>
      <ExperienceHero count={experiences.length} />

      <div className="container-page py-8 lg:py-10">
        <ExperienceFilters
          categories={categories}
          filterCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          filterCity={filterCity}
          onCityChange={setFilterCity}
          hasFilter={!!hasFilter}
          onClear={clearFilters}
        />

        <div className="mt-8">
          {loading ? (
            <ExperienceSkeletonGrid />
          ) : error ? (
            <ExperienceErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
          ) : empty ? (
            <ExperienceEmptyState hasActiveFilters={!!hasFilter} onClearFilters={clearFilters} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {experiences.map((experience) => (
                <ExperienceCard key={experience.id} experience={experience} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
