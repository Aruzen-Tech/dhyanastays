'use client';

import { useState } from 'react';
import type { Tag } from '../../lib/types';
import { IconCheck, IconChevronDown } from './icons';

export interface StayFilterPanelProps {
  uniqueStates: string[];
  filterState: string;
  setFilterState: (value: string) => void;

  filterGuests: string;
  setFilterGuests: (value: string) => void;

  filterMinPrice: string;
  setFilterMinPrice: (value: string) => void;
  filterMaxPrice: string;
  setFilterMaxPrice: (value: string) => void;
  /** 3 preset price buckets (Under X / X–Y / Above Y) — X and Y are derived
   * from real listing data in app/page.tsx, not fixed. */
  priceBuckets: { label: string; min: string; max: string }[];

  filterPropertyType: string;
  setFilterPropertyType: (value: string) => void;
  /** Property types actually present on at least one current listing. */
  availablePropertyTypes: string[];

  filterExperienceTags: string[];
  toggleExperience: (tag: string) => void;
  /** Experience tags actually present on at least one current listing. */
  availableExperienceTags: string[];

  filterDietary: string[];
  toggleDietary: (option: string) => void;
  /** Dietary options actually present on at least one current listing. */
  availableDietaryOptions: string[];

  filterTags: string[];
  toggleTag: (tagId: string) => void;
  tagsByCategory: Record<string, Tag[]>;

  activeFilterCount: number;
  clearFilters: () => void;
  formatFacet: (s: string) => string;
  focusRingClassName: string;
}

/** Small uppercase section label, with an optional live "N selected" indicator. */
function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        {children}
      </p>
      {!!count && (
        <span className="text-[11px] font-semibold text-brand-700 tabular-nums">{count} selected</span>
      )}
    </div>
  );
}

/** Recurring visual rhythm for each filter group — a hairline divider between sections. */
function Section({ children }: { children: React.ReactNode }) {
  return <div className="pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">{children}</div>;
}

function Pill({
  active,
  onClick,
  children,
  focusRingClassName,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  focusRingClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-brand-700 text-white border-brand-700'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
      } ${focusRingClassName}`}
    >
      {children}
    </button>
  );
}

/**
 * Location control, styled like the toolbar's Sort popup (a trigger button
 * that opens a floating option list with a checkmark on the active row)
 * instead of a native <select>, which renders with unstyleable OS-native
 * option styling that doesn't match the rest of the panel.
 */
function LocationDropdown({
  uniqueStates,
  filterState,
  setFilterState,
  focusRingClassName,
}: {
  uniqueStates: string[];
  filterState: string;
  setFilterState: (value: string) => void;
  focusRingClassName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Filter by state"
        className={`input flex items-center justify-between gap-2 text-left ${focusRingClassName}`}
      >
        {filterState || 'All destinations'}
        <IconChevronDown className={`text-gray-400 shrink-0 ${open ? 'rotate-180 transition-transform' : 'transition-transform'}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 max-h-64 overflow-y-auto rounded-2xl bg-white glass-card p-1.5 z-20 animate-scale-in">
            <button
              type="button"
              onClick={() => { setFilterState(''); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors ${
                !filterState ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              All destinations
              {!filterState && <IconCheck />}
            </button>
            {uniqueStates.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setFilterState(s); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors ${
                  filterState === s ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {s}
                {filterState === s && <IconCheck />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The actual filter controls — a single shared source powering FilterPanel,
 * so the filtering behavior only exists in one place. Every field here maps
 * 1:1 to state already owned by app/page.tsx; this component only renders,
 * it never fetches or computes filter results itself. The drawer around it
 * (FilterPanel) owns the "Filters" title and the Clear all / Show results
 * actions, so this content starts directly with the first filter group.
 */
export default function StayFilterPanelContent({
  uniqueStates,
  filterState,
  setFilterState,
  filterGuests,
  setFilterGuests,
  filterMinPrice,
  setFilterMinPrice,
  filterMaxPrice,
  setFilterMaxPrice,
  priceBuckets,
  filterPropertyType,
  setFilterPropertyType,
  availablePropertyTypes,
  filterExperienceTags,
  toggleExperience,
  availableExperienceTags,
  filterDietary,
  toggleDietary,
  availableDietaryOptions,
  filterTags,
  toggleTag,
  tagsByCategory,
  formatFacet,
  focusRingClassName,
}: StayFilterPanelProps) {
  const amenityCount = filterTags.length;

  return (
    <div className="space-y-6">
      {/* Location */}
      {uniqueStates.length > 0 && (
        <Section>
          <SectionLabel>Location</SectionLabel>
          <LocationDropdown
            uniqueStates={uniqueStates}
            filterState={filterState}
            setFilterState={setFilterState}
            focusRingClassName={focusRingClassName}
          />
        </Section>
      )}

      {/* Price — preset buckets derived from the real min/max nightly rate
          in the current catalog (see priceBuckets in app/page.tsx), not a
          fixed range. Selecting a bucket sets both filterMinPrice and
          filterMaxPrice at once; re-selecting the active bucket clears both. */}
      {priceBuckets.length > 0 && (
        <Section>
          <SectionLabel>Price per night</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {priceBuckets.map((bucket) => {
              const active = filterMinPrice === bucket.min && filterMaxPrice === bucket.max;
              return (
                <Pill
                  key={bucket.label}
                  active={active}
                  focusRingClassName={focusRingClassName}
                  onClick={() => {
                    if (active) {
                      setFilterMinPrice('');
                      setFilterMaxPrice('');
                    } else {
                      setFilterMinPrice(bucket.min);
                      setFilterMaxPrice(bucket.max);
                    }
                  }}
                >
                  {bucket.label}
                </Pill>
              );
            })}
          </div>
        </Section>
      )}

      {/* Guests */}
      <Section>
        <SectionLabel>Guests</SectionLabel>
        <input
          id="discovery-filter-guests"
          type="number"
          min={1}
          max={20}
          placeholder="Any number of guests"
          value={filterGuests}
          onChange={(e) => setFilterGuests(e.target.value)}
          className="input text-sm"
          aria-label="Minimum guest capacity"
        />
      </Section>

      {/* Stay type — only property types actually present on a current listing */}
      {availablePropertyTypes.length > 0 && (
        <Section>
          <SectionLabel>Stay type</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Pill active={!filterPropertyType} onClick={() => setFilterPropertyType('')} focusRingClassName={focusRingClassName}>
              Any
            </Pill>
            {availablePropertyTypes.map((pt) => (
              <Pill
                key={pt}
                active={filterPropertyType === pt}
                onClick={() => setFilterPropertyType(pt)}
                focusRingClassName={focusRingClassName}
              >
                {formatFacet(pt)}
              </Pill>
            ))}
          </div>
        </Section>
      )}

      {/* Experience — only tags actually present on a current listing */}
      {availableExperienceTags.length > 0 && (
        <Section>
          <SectionLabel count={filterExperienceTags.length}>Experience</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {availableExperienceTags.map((tag) => (
              <Pill
                key={tag}
                active={filterExperienceTags.includes(tag)}
                onClick={() => toggleExperience(tag)}
                focusRingClassName={focusRingClassName}
              >
                {formatFacet(tag)}
              </Pill>
            ))}
          </div>
        </Section>
      )}

      {/* Dietary — only options actually present on a current listing */}
      {availableDietaryOptions.length > 0 && (
        <Section>
          <SectionLabel count={filterDietary.length}>Dietary options</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {availableDietaryOptions.map((option) => (
              <Pill
                key={option}
                active={filterDietary.includes(option)}
                onClick={() => toggleDietary(option)}
                focusRingClassName={focusRingClassName}
              >
                {formatFacet(option)}
              </Pill>
            ))}
          </div>
        </Section>
      )}

      {/* Amenities — real Tag rows, grouped by category */}
      {Object.keys(tagsByCategory).length > 0 && (
        <Section>
          <SectionLabel count={amenityCount}>Amenities &amp; Features</SectionLabel>
          <div className="space-y-4">
            {Object.entries(tagsByCategory).map(([category, tags]) => (
              <div key={category}>
                <p className="text-xs text-gray-400 mb-1.5 capitalize">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Pill
                      key={tag.id}
                      active={filterTags.includes(tag.id)}
                      onClick={() => toggleTag(tag.id)}
                      focusRingClassName={focusRingClassName}
                    >
                      {tag.name}
                    </Pill>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
