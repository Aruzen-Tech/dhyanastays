import { IconMapPin, IconX } from '../explore-stays/icons';

interface Props {
  categories: readonly string[];
  filterCategory: string;
  onCategoryChange: (category: string) => void;
  filterCity: string;
  onCityChange: (city: string) => void;
  hasFilter: boolean;
  onClear: () => void;
}

/** 'yoga-class' -> 'Yoga class' — display formatting only. */
function formatCategory(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

/**
 * Presentation-only redesign of the existing city/category filters — same
 * state and handlers as before (filterCategory/setFilterCategory,
 * filterCity/setFilterCity, categories from experiencesApi.getCategories()),
 * just restyled: a search-style city field and a horizontally-scrollable
 * category pill row instead of a wrapping list, so it never grows tall on
 * mobile no matter how many categories the API returns.
 */
export default function ExperienceFilters({
  categories,
  filterCategory,
  onCategoryChange,
  filterCity,
  onCityChange,
  hasFilter,
  onClear,
}: Props) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Filter by city</span>
          <IconMapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={filterCity}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Filter by city — e.g. Rishikesh"
            className="input pl-10"
          />
        </label>

        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="btn-ghost shrink-0 text-sm"
          >
            <IconX className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onCategoryChange('')}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            filterCategory === ''
              ? 'border-brand-700 bg-brand-700 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-brand-700 hover:text-brand-700'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryChange(category)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              filterCategory === category
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-700 hover:text-brand-700'
            }`}
          >
            {formatCategory(category)}
          </button>
        ))}
      </div>
    </div>
  );
}
