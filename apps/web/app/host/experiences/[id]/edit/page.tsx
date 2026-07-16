'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';
import { experiencesApi, formatINR } from '../../../../../lib/api';
import type { Experience, ExperienceBooking } from '../../../../../lib/types';

export default function EditExperiencePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<readonly string[]>([]);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [bookings, setBookings] = useState<ExperienceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    state: '',
    country: '',
    startsAt: '',
    endsAt: '',
    capacity: 0,
    priceRupees: 0,
    imageUrl: '',
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'HOST')) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!id || !user) return;
    experiencesApi.getCategories().then((r) => setCategories(r.categories));
    experiencesApi
      .getById(id)
      .then((e) => {
        setExperience(e);
        setForm({
          title: e.title,
          description: e.description,
          category: e.category,
          city: e.city,
          state: e.state,
          country: e.country,
          startsAt: new Date(e.startsAt).toISOString().slice(0, 16),
          endsAt: new Date(e.endsAt).toISOString().slice(0, 16),
          capacity: e.capacity,
          priceRupees: Math.round(e.priceMinor / 100),
          imageUrl: e.imageUrl ?? '',
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

    experiencesApi
      .getHostBookings(id)
      .then(setBookings)
      .catch(() => {});
  }, [id, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await experiencesApi.update(id, {
        title: form.title,
        description: form.description,
        category: form.category,
        city: form.city,
        state: form.state,
        country: form.country,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        capacity: form.capacity,
        priceMinor: Math.round(form.priceRupees * 100),
        imageUrl: form.imageUrl || undefined,
      });
      setSuccess('Changes saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Experience not found.'}</p>
      </div>
    );
  }

  const seatsBooked = bookings
    .filter((b) => ['HELD', 'CONFIRMED', 'COMPLETED'].includes(b.status))
    .reduce((s, b) => s + b.seats, 0);

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <Link href="/host/experiences" className="btn-ghost text-sm mb-4 inline-block">
        ← Back
      </Link>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="page-title">Edit experience</h1>
          <p className="text-sm text-gray-500 mt-1">
            Status: <span className="font-medium">{experience.status.replace(/_/g, ' ')}</span>
          </p>
        </div>
        <Link href={`/experiences/${experience.id}`} className="btn-ghost text-sm">
          View public page →
        </Link>
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-4 mb-6">
        <div>
          <label className="label">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="label">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">State</label>
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Country</label>
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Starts at</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Ends at</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Capacity</label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Price per seat (₹)</label>
            <input
              type="number"
              min={0}
              value={form.priceRupees}
              onChange={(e) => setForm({ ...form, priceRupees: Number(e.target.value) })}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Image URL</label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="input"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <span className="spinner" /> : 'Save changes'}
        </button>
      </form>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Bookings</h2>
        <p className="text-xs text-gray-500 mb-4">
          {seatsBooked}/{experience.capacity} seats taken
        </p>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-400">No bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between text-sm border-b border-gray-50 py-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{b.guest?.fullName ?? 'Guest'}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(b.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">
                    {b.seats} seat{b.seats === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs font-semibold text-brand-700">
                    {formatINR(b.totalMinor)}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
