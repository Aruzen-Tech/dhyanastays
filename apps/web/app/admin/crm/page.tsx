'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  crmApi,
  formatINR,
  type CrmContactRow,
  type CrmLifecycleStage,
  type CrmSegment,
  type CrmTag,
} from '../../../lib/api';
import CrmTabs from '../../../components/crm/CrmTabs';
import OutreachComposer from '../../../components/crm/OutreachComposer';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 25;

export default function CrmContactsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<CrmContactRow[]>([]);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [stages, setStages] = useState<CrmLifecycleStage[]>([]);
  const [segments, setSegments] = useState<CrmSegment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [tagId, setTagId] = useState('');
  const [sort, setSort] = useState('recent');
  const debouncedSearch = useDebounce(search, 350);

  // Selection + bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTagId, setBulkTagId] = useState('');
  const [bulkStageId, setBulkStageId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [composeIds, setComposeIds] = useState<string[] | null>(null);
  const [composeSegment, setComposeSegment] = useState<CrmSegment | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    crmApi.listTags().then(setTags).catch(() => {});
    crmApi.listStages().then(setStages).catch(() => {});
    crmApi.listSegments().then(setSegments).catch(() => {});
  }, []);

  const reloadSegments = useCallback(() => {
    crmApi.listSegments().then(setSegments).catch(() => {});
  }, []);

  const applySegment = (s: CrmSegment) => {
    setSearch(s.q ?? '');
    setType(s.type && s.type !== 'all' ? s.type : '');
    setTagId(s.tagId ?? '');
    setSort(s.sort ?? 'recent');
  };

  const saveCurrentSegment = async () => {
    const name = window.prompt('Name this segment (saves the current filters):');
    if (!name?.trim()) return;
    try {
      await crmApi.saveSegment({
        name: name.trim(),
        type: type || undefined,
        q: debouncedSearch || undefined,
        tagId: tagId || undefined,
        sort,
      });
      reloadSegments();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save segment');
    }
  };

  const removeSegment = async (id: string) => {
    if (!window.confirm('Delete this segment?')) return;
    await crmApi.deleteSegment(id).catch(() => {});
    reloadSegments();
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await crmApi.listContacts({
        q: debouncedSearch || undefined,
        type: type || undefined,
        tagId: tagId || undefined,
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, type, tagId, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, tagId, sort]);

  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  // Selection is per-page; clear it whenever the visible rows change.
  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAllOnPage = () =>
    setSelected(allOnPageSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const runBulk = async (fn: (ids: string[]) => Promise<{ count: number }>) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError('');
    try {
      await fn(ids);
      setSelected(new Set());
      setBulkTagId('');
      setBulkStageId('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const selectedCount = selected.size;

  if (isLoading || (!user && !error)) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="eyebrow text-brand-700">Relationship management</p>
          <h1 className="page-title">CRM · Contacts</h1>
          <p className="text-sm text-muted mt-1">
            {total.toLocaleString('en-IN')} guest{total === 1 ? '' : 's'} &amp; hosts
          </p>
        </div>
      </div>

      <CrmTabs />

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="input"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All contacts</option>
            <option value="guest">Guests</option>
            <option value="host">Hosts</option>
          </select>
          <select className="input" value={tagId} onChange={(e) => setTagId(e.target.value)}>
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {typeof t.count === 'number' ? ` (${t.count})` : ''}
              </option>
            ))}
          </select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Newest first</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Saved segments */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Segments:</span>
        {segments.length === 0 && <span className="text-xs text-muted">none saved</span>}
        {segments.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <button
              type="button"
              onClick={() => applySegment(s)}
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              {s.name}
            </button>
            <button
              type="button"
              onClick={() => setComposeSegment(s)}
              aria-label={`Message segment ${s.name}`}
              title="Message this segment"
              className="text-brand-400 hover:text-brand-700"
            >
              ✉
            </button>
            <button
              type="button"
              onClick={() => removeSegment(s.id)}
              aria-label={`Delete segment ${s.name}`}
              className="text-brand-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
        <button type="button" onClick={saveCurrentSegment} className="text-xs text-brand-700 hover:underline">
          + Save current filter
        </button>
      </div>

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="card mb-4 flex flex-wrap items-center gap-3 bg-brand-50/60 p-3 dark:bg-gray-800/60">
          <span className="text-sm font-medium">{selectedCount} selected</span>

          <div className="flex items-center gap-1.5">
            <select
              className="input py-1.5 text-sm"
              value={bulkTagId}
              onChange={(e) => setBulkTagId(e.target.value)}
            >
              <option value="">Add tag…</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              className="btn-secondary text-sm py-1.5"
              disabled={!bulkTagId || bulkBusy}
              onClick={() => runBulk((ids) => crmApi.bulkTag(ids, bulkTagId))}
            >
              Apply
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              className="input py-1.5 text-sm"
              value={bulkStageId}
              onChange={(e) => setBulkStageId(e.target.value)}
            >
              <option value="">Move to stage…</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.kind.toLowerCase()})
                </option>
              ))}
            </select>
            <button
              className="btn-secondary text-sm py-1.5"
              disabled={!bulkStageId || bulkBusy}
              onClick={() => runBulk((ids) => crmApi.bulkStage(ids, bulkStageId))}
            >
              Apply
            </button>
          </div>

          <button
            className="btn-secondary text-sm py-1.5"
            disabled={bulkBusy}
            onClick={() => setComposeIds([...selected])}
          >
            Message
          </button>
          <button
            className="btn-secondary text-sm py-1.5"
            disabled={bulkBusy}
            onClick={() => runBulk((ids) => crmApi.bulkOwner(ids, user?.sub ?? null))}
          >
            Assign to me
          </button>
          <button
            className="btn-ghost text-sm py-1.5"
            disabled={bulkBusy}
            onClick={() => runBulk((ids) => crmApi.bulkOwner(ids, null))}
          >
            Clear owner
          </button>
          <button
            className="btn-ghost text-sm py-1.5 ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </button>
        </div>
      )}

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-gray-100">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium text-right">Bookings</th>
                <th className="px-4 py-3 font-medium text-right">Lifetime value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <span className="spinner text-brand-700" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    No contacts match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/admin/crm/${r.id}`)}
                    className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selected.has(r.id) ? 'bg-brand-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.fullName}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{r.fullName}</span>
                        {r.doNotContact && (
                          <span className="badge badge-warning" title="Do not contact">
                            DNC
                          </span>
                        )}
                      </div>
                      <div className="text-muted">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-gray-100 text-gray-600">
                        {r.type === 'HOST' ? 'Host' : 'Guest'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.tags.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="badge"
                            style={{ backgroundColor: `${t.color}22`, color: t.color }}
                          >
                            {t.name}
                          </span>
                        ))}
                        {r.tags.length > 3 && (
                          <span className="text-xs text-muted">+{r.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.bookingsCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                      {formatINR(r.totalSpentPaise)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </button>
            <button
              className="btn-ghost"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted mt-6">
        <Link href="/admin/control-panel" className="hover:text-brand-700">
          Control Panel
        </Link>{' '}
        · CRM is gated by the <code>crm</code> feature flag.
      </p>

      {composeIds && composeIds.length > 0 && (
        <OutreachComposer
          target={{ kind: 'selection', userIds: composeIds }}
          onClose={() => setComposeIds(null)}
        />
      )}
      {composeSegment && (
        <OutreachComposer
          target={{ kind: 'segment', segmentId: composeSegment.id, label: composeSegment.name }}
          onClose={() => setComposeSegment(null)}
        />
      )}
    </div>
  );
}
