'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import {
  formatINR,
  listingsApi,
  spotlightApi,
  type SpotlightAdminItem,
} from '../../../lib/api';
import type { Listing } from '../../../lib/types';
import MediaUploader from '../../../components/media/MediaUploader';

/** Curated Stay Spotlight management — search listings, feature them, reorder. */
export default function AdminSpotlightPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<SpotlightAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Listing[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await spotlightApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load spotlight');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounced listing search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      try {
        const found = await listingsApi.search(q);
        if (seq === searchSeq.current) setResults(found);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const featuredIds = new Set(items.map((i) => i.listingId));

  const add = async (listingId: string) => {
    setBusy(`add-${listingId}`);
    setError('');
    try {
      await spotlightApi.add({ listingId });
      setQuery('');
      setResults([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add stay');
    } finally {
      setBusy('');
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await spotlightApi.remove(id);
      await load();
    } finally {
      setBusy('');
    }
  };

  const toggleActive = async (item: SpotlightAdminItem) => {
    setBusy(item.id);
    try {
      await spotlightApi.update(item.id, { isActive: !item.isActive });
      await load();
    } finally {
      setBusy('');
    }
  };

  const saveText = async (id: string, patch: { badge?: string; tagline?: string }) => {
    setBusy(id);
    try {
      await spotlightApi.update(id, patch);
      await load();
    } finally {
      setBusy('');
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const ordered = [...items];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setItems(ordered); // optimistic
    setBusy('reorder');
    try {
      setItems(await spotlightApi.reorder(ordered.map((i) => i.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reorder');
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

  return (
    <div className="container-page py-8">
      <p className="eyebrow text-brand-700">Homepage curation</p>
      <h1 className="page-title mb-1">Stay Spotlight</h1>
      <p className="text-sm text-muted mb-6">
        Feature hand-picked stays in the homepage carousel. Search a listing to add it, reorder to
        set the slide sequence, and toggle visibility without deleting.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* ── Add a stay ── */}
      <div className="card p-4 mb-6">
        <label className="block text-sm font-medium mb-2">Add a featured stay</label>
        <input
          className="input"
          placeholder="Search listings by title, city or state…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-auto">
            {searching && <p className="p-3 text-sm text-muted">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="p-3 text-sm text-muted">No listings match “{query.trim()}”.</p>
            )}
            {results.map((l) => {
              const already = featuredIds.has(l.id);
              const rate = l.rateRules?.[0]?.baseNightlyRate;
              return (
                <div key={l.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="truncate text-xs text-muted">
                      {[l.city, l.state].filter(Boolean).join(', ')}
                      {typeof rate === 'number' ? ` · ${formatINR(rate)}/night` : ''}
                      {l.status !== 'APPROVED' ? ` · ${l.status}` : ''}
                    </p>
                  </div>
                  <button
                    className="btn-secondary text-sm py-1.5 shrink-0"
                    disabled={already || busy === `add-${l.id}`}
                    onClick={() => add(l.id)}
                  >
                    {already ? 'Added' : busy === `add-${l.id}` ? 'Adding…' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Current spotlight ── */}
      <h2 className="text-lg font-semibold mb-3">
        Featured stays{items.length > 0 ? ` (${items.length})` : ''}
      </h2>

      {loading ? (
        <div className="py-10 text-center">
          <span className="spinner text-brand-700 w-6 h-6" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No featured stays yet. The homepage shows curated sample stays until you add real ones
          here.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <SpotlightRow
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              busy={busy}
              onMove={move}
              onToggle={toggleActive}
              onRemove={remove}
              onSaveText={saveText}
              onReload={load}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SpotlightRow({
  item,
  index,
  total,
  busy,
  onMove,
  onToggle,
  onRemove,
  onSaveText,
  onReload,
}: {
  item: SpotlightAdminItem;
  index: number;
  total: number;
  busy: string;
  onMove: (index: number, dir: -1 | 1) => void;
  onToggle: (item: SpotlightAdminItem) => void;
  onRemove: (id: string) => void;
  onSaveText: (id: string, patch: { badge?: string; tagline?: string }) => void;
  onReload: () => Promise<void>;
}) {
  const [badge, setBadge] = useState(item.badge ?? '');
  const [tagline, setTagline] = useState(item.tagline ?? '');
  const dirty = badge !== (item.badge ?? '') || tagline !== (item.tagline ?? '');
  const rowBusy = busy === item.id;

  const addMedia = async (m: { url: string; mediaType: string; sortOrder: number }) => {
    const created = await spotlightApi.addMedia(item.id, m);
    await onReload();
    return created;
  };
  const removeMedia = async (mediaId: string) => {
    await spotlightApi.deleteMedia(item.id, mediaId);
    await onReload();
  };

  return (
    <li className={`card p-4 ${item.isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-4">
        {/* Reorder */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            className="h-7 w-7 rounded-md border border-gray-200 dark:border-gray-700 text-sm leading-none hover:bg-brand-50 disabled:opacity-40"
            aria-label="Move up"
            disabled={index === 0 || busy === 'reorder'}
            onClick={() => onMove(index, -1)}
          >
            ↑
          </button>
          <span className="text-center text-xs text-muted">{index + 1}</span>
          <button
            className="h-7 w-7 rounded-md border border-gray-200 dark:border-gray-700 text-sm leading-none hover:bg-brand-50 disabled:opacity-40"
            aria-label="Move down"
            disabled={index === total - 1 || busy === 'reorder'}
            onClick={() => onMove(index, 1)}
          >
            ↓
          </button>
        </div>

        {/* Thumb */}
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-100">
          {item.listing.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.listing.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{item.listing.title}</p>
            {item.listing.status !== 'APPROVED' && (
              <span className="badge-warning text-xs">{item.listing.status}</span>
            )}
            {!item.isActive && <span className="badge text-xs">Hidden</span>}
          </div>
          <p className="truncate text-xs text-muted">
            {item.listing.location} · {formatINR(item.listing.nightlyRate)}/night ·{' '}
            {item.listing.rating.toFixed(1)}★ ({item.listing.reviewCount})
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Badge (default: Featured Stay)"
              maxLength={40}
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
            />
            <input
              className="input"
              placeholder="Tagline (optional, overrides description)"
              maxLength={160}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
          {dirty && (
            <div className="mt-2">
              <button
                className="btn-secondary text-sm py-1.5"
                disabled={rowBusy}
                onClick={() => onSaveText(item.id, { badge, tagline })}
              >
                {rowBusy ? 'Saving…' : 'Save text'}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            className="btn-secondary text-sm py-1.5 w-24"
            disabled={rowBusy}
            onClick={() => onToggle(item)}
          >
            {item.isActive ? 'Hide' : 'Show'}
          </button>
          <button
            className="btn-danger text-sm py-1.5 w-24"
            disabled={rowBusy}
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Optional media — a cover photo/video shown on the homepage billboard */}
      <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
        <MediaUploader
          items={item.media}
          folder={`spotlight/${item.id}`}
          onAdd={addMedia}
          onDelete={removeMedia}
          minImages={0}
          minVideos={0}
          aspect={16 / 9}
          label="Spotlight media (optional)"
          hint="First photo overrides the listing image on the billboard."
        />
      </div>
    </li>
  );
}
