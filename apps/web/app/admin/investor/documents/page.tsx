'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { adminInvestorApi, formatDate } from '../../../../lib/api';
import type { AdminInvestorDocument, InvestorDocumentKind } from '../../../../lib/types';

const KIND_OPTIONS: InvestorDocumentKind[] = [
  'AGREEMENT',
  'KYC',
  'TAX_FORM',
  'STATEMENT',
  'OTHER',
];

export default function AdminInvestorDocumentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<AdminInvestorDocument[]>([]);
  const [filterInvestor, setFilterInvestor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    investorUserId: '',
    kind: 'AGREEMENT' as InvestorDocumentKind,
    title: '',
    url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = () => {
    setLoading(true);
    setError('');
    adminInvestorApi
      .listDocuments(filterInvestor || undefined)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const upload = async () => {
    if (!form.investorUserId || !form.title || !form.url) {
      alert('Investor, title and URL are required');
      return;
    }
    setSubmitting(true);
    try {
      await adminInvestorApi.uploadDocument({
        investorUserId: form.investorUserId.trim(),
        kind: form.kind,
        title: form.title.trim(),
        url: form.url.trim(),
      });
      setForm({ investorUserId: '', kind: 'AGREEMENT', title: '', url: '' });
      setShowForm(false);
      showToast('✅ Document uploaded');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this document? The investor will no longer see it.')) return;
    setActionLoading(id);
    try {
      await adminInvestorApi.removeDocument(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      showToast('Document deleted');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Investor Documents</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload agreements, KYC, tax forms and statements to an investor's document vault.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/admin/investor/investments" className="btn-ghost text-sm">Investments</Link>
        <Link href="/admin/investor/capital-calls" className="btn-ghost text-sm">Capital Calls</Link>
        <Link href="/admin/investor/documents" className="btn-primary text-sm py-2 px-4">Documents</Link>
        <Link href="/admin/investor/distributions" className="btn-ghost text-sm">Distributions</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs text-gray-500 mb-1">Filter by investor user ID</label>
          <input
            value={filterInvestor}
            onChange={(e) => setFilterInvestor(e.target.value)}
            placeholder="cuid…"
            className="input text-sm py-2"
          />
        </div>
        <button onClick={load} className="btn-primary text-sm py-2 px-4">Apply</button>
        <button onClick={() => setShowForm((v) => !v)} className="btn-secondary text-sm py-2 px-4">
          {showForm ? 'Cancel' : '+ Upload'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6 space-y-3">
          <h3 className="font-semibold">Upload Document</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Investor user ID *</label>
              <input
                value={form.investorUserId}
                onChange={(e) => setForm({ ...form, investorUserId: e.target.value })}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kind *</label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as InvestorDocumentKind })}
                className="input text-sm py-2"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input text-sm py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">URL *</label>
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="input text-sm py-2"
              />
              <p className="text-xs text-gray-400 mt-1">
                Investors open the file directly from the vault — the URL should be accessible.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={upload} disabled={submitting} className="btn-primary text-sm py-2 px-4">
              {submitting ? 'Uploading…' : 'Upload'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="font-semibold text-gray-700 mb-2">No documents</h3>
          <p className="text-gray-400 text-sm">Upload the first document above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Investor</th>
                  <th className="text-left px-4 py-3">Kind</th>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.investor.fullName}</p>
                      <p className="text-xs text-gray-400">{r.investor.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                        {r.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 hover:underline"
                      >
                        {r.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(r.uploadedAt)}
                      {r.uploadedBy && <span className="block">by {r.uploadedBy.fullName}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        disabled={actionLoading === r.id}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
