'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hostQuickRepliesApi } from '../../../lib/api';
import type { HostQuickReply } from '../../../lib/types';

export default function HostQuickRepliesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<HostQuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HostQuickReply | null>(null);
  const [form, setForm] = useState({ label: '', body: '', sortOrder: 0 });

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = async () => {
    try {
      const data = await hostQuickRepliesApi.list();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const resetForm = () => {
    setEditing(null);
    setForm({ label: '', body: '', sortOrder: 0 });
  };

  const startEdit = (qr: HostQuickReply) => {
    setEditing(qr);
    setForm({ label: qr.label, body: qr.body, sortOrder: qr.sortOrder });
  };

  const submit = async () => {
    setError('');
    if (!form.label.trim() || !form.body.trim()) {
      setError('Label and body are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await hostQuickRepliesApi.update(editing.id, form);
      } else {
        await hostQuickRepliesApi.create(form);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this quick reply?')) return;
    try {
      await hostQuickRepliesApi.remove(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-10">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Quick replies</h1>
        <p className="text-gray-500 text-sm mt-1">
          Reusable canned responses for your concierge chats. Use for WiFi,
          yoga schedules, pickup instructions, and anything you repeat often.
        </p>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="card p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">
          {editing ? 'Edit quick reply' : 'New quick reply'}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="label">Label (shown on chip)</label>
            <input
              className="input w-full"
              placeholder="e.g. WiFi password"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              maxLength={80}
            />
          </div>
          <div>
            <label className="label">Message body</label>
            <textarea
              className="input w-full"
              rows={4}
              placeholder="The message guests receive when you tap this chip."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              maxLength={2000}
            />
          </div>
          <div>
            <label className="label">Sort order (lower appears first)</label>
            <input
              type="number"
              className="input w-32"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? '…' : editing ? 'Save changes' : 'Add quick reply'}
            </button>
            {editing && (
              <button className="btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No quick replies yet. Add your first above.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((qr) => (
            <li key={qr.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{qr.label}</div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                    {qr.body}
                  </p>
                  <div className="text-xs text-gray-400 mt-2">
                    Sort {qr.sortOrder}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => startEdit(qr)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-ghost text-xs text-red-600"
                    onClick={() => void remove(qr.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
