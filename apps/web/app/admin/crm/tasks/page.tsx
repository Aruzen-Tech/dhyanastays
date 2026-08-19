'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { crmApi, formatDate, type CrmTask, type CrmTaskPriority } from '../../../../lib/api';
import CrmTabs from '../../../../components/crm/CrmTabs';

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'badge-info',
  HIGH: 'badge-warning',
};

export default function CrmTasksPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [status, setStatus] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<CrmTaskPriority>('MEDIUM');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTasks(await crmApi.listTasks({ status: status === 'ALL' ? undefined : status }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy('add');
    try {
      await crmApi.createTask({
        title: title.trim(),
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });
      setTitle('');
      setDueAt('');
      setPriority('MEDIUM');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add task');
    } finally {
      setBusy('');
    }
  };

  const complete = async (id: string) => {
    setBusy(id);
    try {
      await crmApi.completeTask(id);
      await load();
    } finally {
      setBusy('');
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await crmApi.deleteTask(id);
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
      <p className="eyebrow text-brand-700">Relationship management</p>
      <h1 className="page-title mb-4">CRM · Tasks</h1>
      <CrmTabs />

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Add task */}
      <form onSubmit={addTask} className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            className="input sm:col-span-2"
            placeholder="New follow-up task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as CrmTaskPriority)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              className="input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <button className="btn-primary shrink-0" disabled={busy === 'add' || !title.trim()}>
              Add
            </button>
          </div>
        </div>
      </form>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        {['OPEN', 'DONE', 'ALL'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`badge ${status === s ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <span className="spinner text-brand-700" />
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No tasks.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`text-gray-900 ${t.status === 'DONE' ? 'line-through text-muted' : ''}`}
                      >
                        {t.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.user ? (
                        <Link href={`/admin/crm/${t.user.id}`} className="text-brand-700 hover:underline">
                          {t.user.fullName}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${PRIORITY_BADGE[t.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{t.dueAt ? formatDate(t.dueAt) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        {t.status !== 'DONE' && (
                          <button
                            className="text-brand-700 hover:underline"
                            disabled={busy === t.id}
                            onClick={() => complete(t.id)}
                          >
                            Complete
                          </button>
                        )}
                        <button
                          className="text-red-600 hover:underline"
                          disabled={busy === t.id}
                          onClick={() => remove(t.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
