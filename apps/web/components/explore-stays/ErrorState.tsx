interface Props {
  message: string;
  onRetry: () => void;
}

/**
 * Restyled presentation only — the underlying error still comes from the
 * same fetch failure in app/page.tsx. `onRetry` re-runs that exact fetch
 * (a small addition: the initial-load effect now also depends on a retry
 * counter, so this button can re-trigger it — no new endpoint, no new logic,
 * same listingsApi.getPublic() call as before).
 */
export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="text-center py-24 px-6" role="alert">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/10 text-error mb-5 text-2xl">
        ⚠️
      </span>
      <h3
        className="text-xl font-semibold text-gray-900 mb-2"
      >
        Unable to load stays
      </h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
