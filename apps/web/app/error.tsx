'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('App error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-5xl font-bold text-red-500 mb-4">Oops</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <button onClick={reset} className="btn-primary px-6 py-2.5 text-sm">
          Try Again
        </button>
      </div>
    </div>
  );
}
