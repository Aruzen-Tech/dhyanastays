'use client';

import type { DiscoverySort, Tag } from '../../lib/types';
import { IconX } from './icons';

const SORT_LABELS: Record<Exclude<DiscoverySort, ''>, string> = {
  newest: 'Newest first',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};

interface Props {
  filterState: string;
  setFilterState: (value: string) => void;
  filterGuests: string;
  setFilterGuests: (value: string) => void;
  filterMinPrice: string;
  setFilterMinPrice: (value: string) => void;
  filterMaxPrice: string;
  setFilterMaxPrice: (value: string) => void;
  filterPropertyType: string;
  setFilterPropertyType: (value: string) => void;
  filterSort: DiscoverySort | '';
  setFilterSort: (value: DiscoverySort | '') => void;
  filterExperienceTags: string[];
  toggleExperience: (tag: string) => void;
  filterDietary: string[];
  toggleDietary: (option: string) => void;
  filterTags: string[];
  toggleTag: (tagId: string) => void;
  allTags: Tag[];
  formatFacet: (s: string) => string;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-700/10 transition-colors"
      >
        <IconX />
      </button>
    </span>
  );
}

/**
 * Removable chips for every active filter — purely a read/write view over
 * the same filter state the sidebar and drawer already control. Removing a
 * chip calls the exact same setter/toggler the filter panel uses.
 */
export default function ActiveFilterChips({
  filterState, setFilterState,
  filterGuests, setFilterGuests,
  filterMinPrice, setFilterMinPrice,
  filterMaxPrice, setFilterMaxPrice,
  filterPropertyType, setFilterPropertyType,
  filterSort, setFilterSort,
  filterExperienceTags, toggleExperience,
  filterDietary, toggleDietary,
  filterTags, toggleTag, allTags,
  formatFacet,
}: Props) {
  const tagById = new Map(allTags.map((t) => [t.id, t]));

  const hasAny =
    filterState || filterGuests || filterMinPrice || filterMaxPrice || filterPropertyType || filterSort ||
    filterExperienceTags.length > 0 || filterDietary.length > 0 || filterTags.length > 0;

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {filterState && <Chip label={filterState} onRemove={() => setFilterState('')} />}
      {filterGuests && <Chip label={`${filterGuests}+ guests`} onRemove={() => setFilterGuests('')} />}
      {(filterMinPrice || filterMaxPrice) && (
        <Chip
          label={
            filterMinPrice && filterMaxPrice
              ? `₹${Number(filterMinPrice).toLocaleString('en-IN')} – ₹${Number(filterMaxPrice).toLocaleString('en-IN')}`
              : filterMinPrice
                ? `Above ₹${Number(filterMinPrice).toLocaleString('en-IN')}`
                : `Under ₹${Number(filterMaxPrice).toLocaleString('en-IN')}`
          }
          onRemove={() => { setFilterMinPrice(''); setFilterMaxPrice(''); }}
        />
      )}
      {filterPropertyType && <Chip label={formatFacet(filterPropertyType)} onRemove={() => setFilterPropertyType('')} />}
      {filterSort && <Chip label={SORT_LABELS[filterSort]} onRemove={() => setFilterSort('')} />}
      {filterExperienceTags.map((tag) => (
        <Chip key={`exp-${tag}`} label={formatFacet(tag)} onRemove={() => toggleExperience(tag)} />
      ))}
      {filterDietary.map((option) => (
        <Chip key={`diet-${option}`} label={formatFacet(option)} onRemove={() => toggleDietary(option)} />
      ))}
      {filterTags.map((tagId) => {
        const tag = tagById.get(tagId);
        if (!tag) return null;
        return <Chip key={`tag-${tagId}`} label={tag.name} onRemove={() => toggleTag(tagId)} />;
      })}
    </div>
  );
}
