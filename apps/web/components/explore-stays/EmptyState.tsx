import { IconLeaf } from './icons';

interface Props {
  hasActiveSearchOrFilters: boolean;
  onClearAll: () => void;
}

export default function EmptyState({ hasActiveSearchOrFilters, onClearAll }: Props) {
  return (
    <div className="text-center py-24 px-6">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 text-brand-700 mb-5">
        <IconLeaf />
      </span>
      <h3
        className="text-xl font-semibold text-gray-900 mb-2"
      >
        {hasActiveSearchOrFilters ? 'No stays match your current selection.' : 'No stays available yet'}
      </h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
        {hasActiveSearchOrFilters
          ? 'Try widening your destination, price range, or stay preferences.'
          : 'Check back soon — our curators are adding new retreats.'}
      </p>
      {hasActiveSearchOrFilters && (
        <button type="button" onClick={onClearAll} className="btn-primary mt-6">
          Clear all filters
        </button>
      )}
    </div>
  );
}
