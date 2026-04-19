'use client';

import { useEffect, useState } from 'react';
import { addOnsApi, formatINR } from '../lib/api';
import type { AddOn, AddOnSelection } from '../lib/types';

interface AddOnPickerProps {
  listingId: string;
  value: AddOnSelection[];
  onChange: (selections: AddOnSelection[]) => void;
  disabled?: boolean;
}

const KIND_ICON: Record<string, string> = {
  TRANSPORT: '🚗',
  FOOD: '🍽️',
  WELLNESS: '🧘',
  EXPERIENCE: '✨',
  CONCIERGE: '🛎️',
  HOUSEKEEPING: '🧹',
};

export default function AddOnPicker({
  listingId,
  value,
  onChange,
  disabled,
}: AddOnPickerProps) {
  const [addOns, setAddOns] = useState<AddOn[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    addOnsApi
      .listForListing(listingId)
      .then((list) => {
        if (!cancelled) setAddOns(list);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load add-ons');
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const quantityFor = (id: string) =>
    value.find((s) => s.addOnId === id)?.quantity ?? 0;

  const setQuantity = (id: string, qty: number) => {
    const filtered = value.filter((s) => s.addOnId !== id);
    onChange(qty > 0 ? [...filtered, { addOnId: id, quantity: qty }] : filtered);
  };

  if (error) {
    return (
      <div className="alert-error text-xs">
        Could not load add-ons: {error}
      </div>
    );
  }
  if (addOns === null) {
    return (
      <div className="text-xs text-gray-500">Loading optional extras…</div>
    );
  }
  if (addOns.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-gray-800">
        Optional extras
      </div>
      <div className="text-xs text-gray-500">
        Enhance your stay with these services. Added to your total.
      </div>
      <div className="space-y-2 mt-2">
        {addOns.map((addon) => {
          const qty = quantityFor(addon.id);
          const kind = addon.provider?.kind ?? 'EXPERIENCE';
          return (
            <div
              key={addon.id}
              className={`border rounded-lg p-3 text-sm transition ${
                qty > 0
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{KIND_ICON[kind] ?? '➕'}</span>
                    <span className="font-medium text-gray-900">
                      {addon.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {addon.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatINR(addon.priceMinor)} each · cancellation:{' '}
                    {addon.cancellationTier.toLowerCase()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={disabled || qty === 0}
                    onClick={() => setQuantity(addon.id, Math.max(0, qty - 1))}
                    className="w-7 h-7 rounded-full border border-gray-300 text-gray-700 disabled:opacity-40"
                    aria-label={`Remove one ${addon.title}`}
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-medium">{qty}</span>
                  <button
                    type="button"
                    disabled={disabled || qty >= addon.maxPerBooking}
                    onClick={() => setQuantity(addon.id, qty + 1)}
                    className="w-7 h-7 rounded-full border border-brand-600 text-brand-700 disabled:opacity-40"
                    aria-label={`Add one ${addon.title}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
