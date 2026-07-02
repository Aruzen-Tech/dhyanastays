'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { sosApi, type TrustedContact } from '../../../lib/api';

const EMPTY_FORM = { name: '', phone: '', email: '', relation: '', primary: false };

export default function TrustedContactsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [editing, setEditing] = useState<TrustedContact | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = async () => {
    try {
      const data = await sosApi.listContacts();
      setContacts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const startEdit = (c: TrustedContact) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      relation: c.relation,
      primary: c.primary,
    });
  };

  const reset = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = async () => {
    setError('');
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!phone && !email) {
      setError('Add a phone or email — at least one is required so we can reach this contact in an emergency.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        phone: phone || null,
        email: email || null,
        relation: form.relation.trim(),
        primary: form.primary,
      };
      if (editing) {
        await sosApi.updateContact(editing.id, body);
        setToast('Contact updated');
      } else {
        await sosApi.createContact(body);
        setToast('Contact added');
      }
      reset();
      await load();
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this contact?')) return;
    try {
      await sosApi.deleteContact(id);
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
    <div className="container-page py-10 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost text-sm mb-4">
          ← Back to dashboard
        </button>
        <h1 className="page-title">Trusted Contacts</h1>
        <p className="text-gray-500 text-sm mt-1">
          People we will alert via SMS and/or email if you trigger an SOS. Add at least
          one — a family member or friend you trust in an emergency. Phone or email is
          fine; provide both for redundancy.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      <section className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          {editing ? 'Edit contact' : 'Add a contact'}
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            type="tel"
            placeholder="Phone in E.164 — e.g. +919876543210"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="input"
            type="email"
            placeholder="Email (optional if phone is set)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <p className="text-xs text-gray-500 -mt-1">
            At least one of phone or email is required. Adding both lets us reach the
            contact even if one channel is unavailable.
          </p>
          <input
            className="input"
            placeholder="Relation (spouse, parent, friend…)"
            value={form.relation}
            onChange={(e) => setForm({ ...form, relation: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.primary}
              onChange={(e) => setForm({ ...form, primary: e.target.checked })}
            />
            Primary contact (first person alerted)
          </label>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          {editing && (
            <button onClick={reset} className="btn-ghost">
              Cancel
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add contact'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-3">Your contacts</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-500">No contacts yet.</p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {c.name}{' '}
                    {c.primary && (
                      <span className="ml-1 text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {[c.phone, c.email].filter(Boolean).join(' · ')}
                    {(c.phone || c.email) && ' · '}
                    {c.relation}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(c)} className="btn-ghost text-xs">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="btn-ghost text-xs text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
