'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { experiencesApi } from '../../../../lib/api';

export default function NewExperiencePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<readonly string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    state: '',
    country: 'India',
    startsAt: '',
    endsAt: '',
    capacity: 10,
    priceRupees: 1500,
    imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'HOST')) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    experiencesApi.getCategories().then((r) => {
      setCategories(r.categories);
      setForm((f) => (f.category ? f : { ...f, category: r.categories[0] }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await experiencesApi.create({
        title: form.title,
        description: form.description,
        category: form.category,
        city: form.city,
        state: form.state || undefined,
        country: form.country || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        capacity: Number(form.capacity),
        priceMinor: Math.round(Number(form.priceRupees) * 100),
        imageUrl: form.imageUrl || undefined,
      });
      router.push(`/host/experiences/${created.id}/edit`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create experience');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <Link href="/host/experiences" className="btn-ghost text-sm mb-4 inline-block">
        ← Back
      </Link>
      <h1 className="page-title mb-6">New experience</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            required
            minLength={5}
            maxLength={160}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input"
            placeholder="Sunrise yoga by the Ganges"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            required
            minLength={20}
            maxLength={4000}
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
            placeholder="Gentle hatha flow followed by pranayama, suitable for all levels..."
          />
        </div>

        <div>
          <label className="label">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input"
            required
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
              required
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
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Ends at</label>
            <input
              type="datetime-local"
              required
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Capacity (seats)</label>
            <input
              type="number"
              min={1}
              max={500}
              required
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
              required
              value={form.priceRupees}
              onChange={(e) => setForm({ ...form, priceRupees: Number(e.target.value) })}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Image URL (optional)</label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="input"
            placeholder="https://..."
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <span className="spinner" /> : 'Create experience'}
        </button>
        <p className="text-xs text-gray-400">
          New experiences start in <strong>PENDING_APPROVAL</strong>. An admin will review before it becomes public.
        </p>
      </form>
    </div>
  );
}
