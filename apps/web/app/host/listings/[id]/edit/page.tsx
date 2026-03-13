'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { listingsApi } from '../../../../../lib/api';
import type { Listing } from '../../../../../lib/types';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    state: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    // Load host listings and find the one matching id
    listingsApi
      .getHostListings()
      .then((listings) => {
        const found = listings.find((l) => l.id === id);
        if (!found) {
          setError('Listing not found or you do not own it');
          return;
        }
        setListing(found);
        setForm({
          title: found.title,
          description: found.description,
          city: found.city,
          state: found.state,
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingListing(false));
  }, [id, user]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await listingsApi.update(id, {
        title: form.title,
        description: form.description,
        city: form.city,
        state: form.state,
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loadingListing) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Listing not found</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary">
          Back to dashboard
        </button>
      </div>
    );
  }

  if (success) {
    const needsReapproval = ['city', 'state', 'description'].some(
      (f) => form[f as keyof typeof form] !== listing?.[f as keyof Listing],
    );
    return (
      <div className="container-page py-16 max-w-lg mx-auto text-center">
        <div className="card p-10">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing updated!</h2>
          {needsReapproval ? (
            <p className="text-amber-700 text-sm mb-6">
              ⚠️ You changed location or description fields — your listing has been sent for re-approval.
            </p>
          ) : (
            <p className="text-gray-500 text-sm mb-6">
              Your changes have been saved.
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/dashboard')} className="btn-primary">
              Back to dashboard
            </button>
            <button onClick={() => setSuccess(false)} className="btn-secondary">
              Edit again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost text-sm mb-4">
          ← Back to dashboard
        </button>
        <h1 className="page-title">Edit listing</h1>
        <p className="text-gray-500 text-sm mt-1">
          Changes to location or description will trigger re-approval.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Basic information</h2>

          <div>
            <label className="label">Listing title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={set('title')}
              className="input"
              maxLength={120}
            />
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea
              required
              value={form.description}
              onChange={set('description')}
              className="input min-h-[120px] resize-y"
              rows={4}
            />
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Editing description triggers re-approval
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Location</h2>
          <p className="text-xs text-amber-600">
            ⚠️ Editing city or state triggers re-approval
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={set('city')}
                className="input"
              />
            </div>
            <div>
              <label className="label">State *</label>
              <input
                type="text"
                required
                value={form.state}
                onChange={set('state')}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Current rate info (read-only) */}
        {listing?.rateRules?.[0] && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Pricing (read-only)</h2>
            <p className="text-sm text-gray-500">
              Rate changes are not yet supported via the edit form. Contact support to update pricing.
            </p>
            <div className="mt-3 flex gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400">Nightly rate</p>
                <p className="font-semibold text-gray-900">
                  ₹{(listing.rateRules[0].baseNightlyRate / 100).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Max guests</p>
                <p className="font-semibold text-gray-900">{listing.rateRules[0].maxGuests}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
            {saving ? <><span className="spinner" /> Saving…</> : 'Save changes'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard')} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
