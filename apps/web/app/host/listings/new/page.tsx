'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { hostApi, listingsApi } from '../../../../lib/api';
import type { Host } from '../../../../lib/types';

export default function NewListingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [hostProfile, setHostProfile] = useState<Host | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    state: '',
    baseNightlyRate: '',
    maxGuests: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    hostApi
      .getProfile()
      .then(setHostProfile)
      .catch(() => setHostProfile(null))
      .finally(() => setProfileLoading(false));
  }, [user]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await listingsApi.create({
        title: form.title,
        description: form.description,
        city: form.city,
        state: form.state,
        baseNightlyRate: Number(form.baseNightlyRate) * 100, // convert ₹ to paise
        maxGuests: Number(form.maxGuests),
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user || profileLoading) return null;

  // ── Host not yet approved ──────────────────────────────────────────────────
  if (!hostProfile || hostProfile.verificationStatus !== 'APPROVED') {
    const isRejected = hostProfile?.verificationStatus === 'REJECTED';
    return (
      <div className="container-page py-16 max-w-lg mx-auto text-center">
        <div className="card p-10">
          <div className="text-5xl mb-4">{isRejected ? '❌' : '⏳'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isRejected ? 'Host profile not approved' : 'Verification pending'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isRejected
              ? 'Your host application was not approved. Please contact support@dhyanastays.com for assistance.'
              : 'Your host profile is under review by the Dhyana Stays team. Once approved, you can create and publish listings. This typically takes 24–48 hours.'}
          </p>
          <button onClick={() => router.push('/dashboard')} className="btn-secondary">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="container-page py-16 max-w-lg mx-auto text-center">
        <div className="card p-10">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing submitted!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your listing has been submitted for admin review. You&apos;ll be notified once it&apos;s approved.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/dashboard')} className="btn-primary">
              Go to dashboard
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setForm({ title: '', description: '', city: '', state: '', baseNightlyRate: '', maxGuests: '' });
              }}
              className="btn-secondary"
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create listing form ────────────────────────────────────────────────────
  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Create a new listing</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your listing will be reviewed by our team before going live.
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
              placeholder="e.g. Himalayan Meditation Retreat"
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
              placeholder="Describe your property, its unique features, and what guests can expect…"
              className="input min-h-[120px] resize-y"
              rows={4}
            />
          </div>
        </div>

        {/* Location */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={set('city')}
                placeholder="Rishikesh"
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
                placeholder="Uttarakhand"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Pricing & capacity */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Pricing & capacity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nightly rate (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.baseNightlyRate}
                  onChange={set('baseNightlyRate')}
                  placeholder="5000"
                  className="input pl-7"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Enter amount in rupees (e.g. 5000 = ₹5,000)</p>
            </div>
            <div>
              <label className="label">Max guests *</label>
              <input
                type="number"
                required
                min={1}
                max={50}
                value={form.maxGuests}
                onChange={set('maxGuests')}
                placeholder="4"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="alert-info">
          <p className="font-medium mb-1">📋 What happens next?</p>
          <ul className="text-xs space-y-1 opacity-80">
            <li>• Your listing is submitted with status <strong>Pending Approval</strong></li>
            <li>• Our admin team reviews it within 24–48 hours</li>
            <li>• Once approved, it appears in the public discovery feed</li>
            <li>• Edits to location or description will trigger re-review</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
            {loading ? (
              <><span className="spinner" /> Submitting…</>
            ) : (
              'Submit for review'
            )}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
