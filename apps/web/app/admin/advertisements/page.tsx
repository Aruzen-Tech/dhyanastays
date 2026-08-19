'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { adApi, type AdminAd } from '../../../lib/api';
import MediaUploader from '../../../components/media/MediaUploader';

interface FormState {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  accentColor: string;
  priority: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  body: '',
  ctaLabel: '',
  ctaHref: '',
  accentColor: '',
  priority: '0',
  startsAt: '',
  endsAt: '',
};

/** ISO string → value for <input type="datetime-local"> (local, no seconds). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusOf(ad: AdminAd): { label: string; cls: string } {
  if (!ad.isActive) return { label: 'Inactive', cls: 'badge-neutral' };
  const now = Date.now();
  if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return { label: 'Scheduled', cls: 'badge-info' };
  if (ad.endsAt && new Date(ad.endsAt).getTime() < now) return { label: 'Expired', cls: 'badge-warning' };
  return { label: 'Live', cls: 'badge-success' };
}

export default function AdminAdvertisementsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAds(await adApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (ad: AdminAd) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title,
      body: ad.body ?? '',
      ctaLabel: ad.ctaLabel ?? '',
      ctaHref: ad.ctaHref ?? '',
      accentColor: ad.accentColor ?? '',
      priority: String(ad.priority),
      startsAt: toLocalInput(ad.startsAt),
      endsAt: toLocalInput(ad.endsAt),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy('save');
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body,
        ctaLabel: form.ctaLabel,
        ctaHref: form.ctaHref,
        priority: Number(form.priority) || 0,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        ...(form.accentColor.trim() ? { accentColor: form.accentColor.trim() } : {}),
      };
      if (editingId) await adApi.update(editingId, payload);
      else await adApi.create(payload);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save advertisement');
    } finally {
      setBusy('');
    }
  };

  const toggleActive = async (ad: AdminAd) => {
    setBusy(ad.id);
    try {
      await adApi.update(ad.id, { isActive: !ad.isActive });
      await load();
    } finally {
      setBusy('');
    }
  };

  const remove = async (ad: AdminAd) => {
    if (!window.confirm(`Delete “${ad.title}”? This cannot be undone.`)) return;
    setBusy(ad.id);
    try {
      await adApi.remove(ad.id);
      if (editingId === ad.id) resetForm();
      await load();
    } finally {
      setBusy('');
    }
  };

  if (isLoading || (!user && !error)) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  const accent = form.accentColor.trim() || '#4b5d3a';

  return (
    <div className="container-page py-8">
      <p className="eyebrow text-brand-700">Marketing</p>
      <h1 className="page-title mb-1">Advertisement Centre</h1>
      <p className="text-sm text-muted mb-6">
        Author the promo billboard at the top of the Explore page. Control the copy, image,
        call-to-action, schedule and priority (order in the rotation), and track impressions
        &amp; clicks. Multiple active ads slide automatically.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Editor ── */}
        <form onSubmit={submit} className="card p-5">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit advertisement' : 'New advertisement'}
          </h2>

          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            className="input mb-3"
            maxLength={120}
            placeholder="Monsoon Wellness Week"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />

          <label className="block text-sm font-medium mb-1">Body</label>
          <textarea
            className="input mb-3"
            rows={3}
            maxLength={600}
            placeholder="One or two lines of supporting copy…"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Button label</label>
              <input
                className="input"
                maxLength={60}
                placeholder="Explore stays"
                value={form.ctaLabel}
                onChange={(e) => set('ctaLabel', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button link</label>
              <input
                className="input"
                placeholder="/experiences or https://…"
                value={form.ctaHref}
                onChange={(e) => set('ctaHref', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <input
                type="number"
                className="input"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Accent colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-10 shrink-0 cursor-pointer rounded border border-gray-200 dark:border-gray-700 bg-transparent"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.accentColor) ? form.accentColor : '#4b5d3a'}
                  onChange={(e) => set('accentColor', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="#4b5d3a"
                  value={form.accentColor}
                  onChange={(e) => set('accentColor', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Starts at</label>
              <input
                type="datetime-local"
                className="input"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ends at</label>
              <input
                type="datetime-local"
                className="input"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
              />
            </div>
          </div>

          <p className="mb-4 text-xs text-muted">
            New ads go live immediately. Optionally add media to each ad below (the first photo
            becomes the billboard image); use Deactivate to take one down.
          </p>

          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={busy === 'save' || !form.title.trim()}>
              {busy === 'save' ? 'Saving…' : editingId ? 'Save changes' : 'Create advertisement'}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* ── Live preview ── */}
        <div className="lg:sticky lg:top-24 self-start">
          <p className="eyebrow text-brand-700 mb-2">Live preview</p>
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900">
            <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-brand-100 to-brand-300 grid place-items-center text-xs text-brand-700/70">
              Media added per-ad below
            </div>
            <div className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
                Featured
              </p>
              <h3 className="mt-1 text-lg font-bold leading-tight text-gray-900 dark:text-white">
                {form.title || 'Your headline here'}
              </h3>
              {form.body && (
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">{form.body}</p>
              )}
              {form.ctaLabel && (
                <span
                  className="mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {form.ctaLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Existing ads ── */}
      <h2 className="text-lg font-semibold mt-8 mb-3">
        All advertisements{ads.length > 0 ? ` (${ads.length})` : ''}
      </h2>

      {loading ? (
        <div className="py-10 text-center">
          <span className="spinner text-brand-700 w-6 h-6" />
        </div>
      ) : ads.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No advertisements yet. Create one above — it appears on the Explore page as soon as it&apos;s
          live.
        </div>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => {
            const s = statusOf(ad);
            const ctr = ad.impressionCount > 0 ? (ad.clickCount / ad.impressionCount) * 100 : 0;
            return (
              <AdRow
                key={ad.id}
                ad={ad}
                status={s}
                ctr={ctr}
                busy={busy}
                onEdit={startEdit}
                onToggle={toggleActive}
                onRemove={remove}
                onReload={load}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AdRow({
  ad,
  status,
  ctr,
  busy,
  onEdit,
  onToggle,
  onRemove,
  onReload,
}: {
  ad: AdminAd;
  status: { label: string; cls: string };
  ctr: number;
  busy: string;
  onEdit: (ad: AdminAd) => void;
  onToggle: (ad: AdminAd) => void;
  onRemove: (ad: AdminAd) => void;
  onReload: () => Promise<void>;
}) {
  const cover = ad.media.find((m) => m.mediaType.startsWith('image'))?.url ?? null;

  const addMedia = async (m: { url: string; mediaType: string; sortOrder: number }) => {
    const created = await adApi.addMedia(ad.id, m);
    await onReload();
    return created;
  };
  const removeMedia = async (mediaId: string) => {
    await adApi.deleteMedia(ad.id, mediaId);
    await onReload();
  };

  return (
    <li className={`card p-4 ${ad.isActive ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-100">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
          <span
            className="absolute inset-x-0 bottom-0 h-1"
            style={{ backgroundColor: ad.accentColor ?? '#4b5d3a' }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{ad.title}</p>
            <span className={`${status.cls} text-xs`}>{status.label}</span>
            <span className="text-xs text-muted">priority {ad.priority}</span>
          </div>
          {ad.body && <p className="mt-0.5 truncate text-xs text-muted">{ad.body}</p>}
          <p className="mt-1 text-xs text-muted">
            {ad.impressionCount.toLocaleString()} impressions · {ad.clickCount.toLocaleString()} clicks
            {ad.impressionCount > 0 ? ` · ${ctr.toFixed(1)}% CTR` : ''}
            {ad.ctaHref ? ` · → ${ad.ctaHref}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button className="btn-secondary text-sm py-1.5 w-24" onClick={() => onEdit(ad)}>
            Edit
          </button>
          <button
            className="btn-secondary text-sm py-1.5 w-24"
            disabled={busy === ad.id}
            onClick={() => onToggle(ad)}
          >
            {ad.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            className="btn-danger text-sm py-1.5 w-24"
            disabled={busy === ad.id}
            onClick={() => onRemove(ad)}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Media — 5 photos + 1 video required to activate */}
      <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
        <MediaUploader
          items={ad.media}
          folder={`advertisements/${ad.id}`}
          onAdd={addMedia}
          onDelete={removeMedia}
          minImages={0}
          minVideos={0}
          aspect={16 / 9}
          label="Advertisement media (optional)"
          hint="First photo becomes the billboard image."
        />
      </div>
    </li>
  );
}
