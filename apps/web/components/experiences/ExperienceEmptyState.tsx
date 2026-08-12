import { IconLeaf } from '../explore-stays/icons';

interface Props {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export default function ExperienceEmptyState({ hasActiveFilters, onClearFilters }: Props) {
  return (
    <div className="py-24 px-6 text-center">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <IconLeaf />
      </span>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">
        {hasActiveFilters ? 'No experiences match your filters.' : 'No experiences available yet'}
      </h3>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500">
        {hasActiveFilters
          ? 'Try a different city or category.'
          : 'Check back soon — our hosts are adding new sessions and retreats.'}
      </p>
      {hasActiveFilters && (
        <button type="button" onClick={onClearFilters} className="btn-primary mt-6">
          Clear filters
        </button>
      )}
    </div>
  );
}
