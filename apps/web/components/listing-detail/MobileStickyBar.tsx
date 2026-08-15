'use client';

import { formatINR } from '../../lib/api';

interface Props {
  nightlyRate: number | undefined;
  /** True only in the initial browsing step — once the guest has started
   * the booking flow they're already looking at the real card, so this bar
   * steps aside rather than floating over active forms. */
  visible: boolean;
}

/**
 * Mobile-only convenience bar — no booking state of its own. Its one action
 * scrolls to the real booking card (id="booking-card" below) so the guest
 * reaches the exact same form/handlers/API calls that already exist;
 * nothing here duplicates or intercepts that logic.
 */
export default function MobileStickyBar({ nightlyRate, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-4">
        {nightlyRate ? (
          <p>
            <span className="text-lg font-bold text-gray-900">{formatINR(nightlyRate)}</span>
            <span className="text-sm text-gray-400"> / night</span>
          </p>
        ) : (
          <p className="text-sm text-gray-400">Price on request</p>
        )}
        <button
          type="button"
          onClick={() => document.getElementById('booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="btn-primary shrink-0 px-6 py-2.5 text-sm"
        >
          Check availability
        </button>
      </div>
    </div>
  );
}
