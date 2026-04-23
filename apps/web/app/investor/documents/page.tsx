'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, investorApi } from '../../../lib/api';
import type { InvestorDocument, InvestorDocumentKind } from '../../../lib/types';

const KIND_LABELS: Record<InvestorDocumentKind, string> = {
  AGREEMENT: 'Investment Agreements',
  KYC: 'KYC Documents',
  TAX_FORM: 'Tax Forms',
  STATEMENT: 'Statements',
  OTHER: 'Other',
};

const KIND_ICONS: Record<InvestorDocumentKind, string> = {
  AGREEMENT: '📄',
  KYC: '🪪',
  TAX_FORM: '🧾',
  STATEMENT: '📊',
  OTHER: '📁',
};

const KIND_ORDER: InvestorDocumentKind[] = [
  'AGREEMENT',
  'KYC',
  'TAX_FORM',
  'STATEMENT',
  'OTHER',
];

export default function InvestorDocumentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [docs, setDocs] = useState<InvestorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.kind !== 'INVESTOR' && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    if (user.kind !== 'INVESTOR' && user.role !== 'ADMIN') return;
    investorApi
      .listDocuments()
      .then(setDocs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const grouped = useMemo(() => {
    const by: Record<InvestorDocumentKind, InvestorDocument[]> = {
      AGREEMENT: [],
      KYC: [],
      TAX_FORM: [],
      STATEMENT: [],
      OTHER: [],
    };
    for (const d of docs) by[d.kind].push(d);
    return by;
  }, [docs]);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Document Vault</h1>
        <p className="text-gray-500 text-sm mt-1">
          Agreements, KYC, tax forms and statements uploaded by the admin team.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/investor/portfolio" className="btn-ghost text-sm">Portfolio</Link>
        <Link href="/investor/distributions" className="btn-ghost text-sm">Distributions</Link>
        <Link href="/investor/capital-calls" className="btn-ghost text-sm">Capital Calls</Link>
        <Link href="/investor/documents" className="btn-primary text-sm py-2 px-4">Documents</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      {loading ? (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="font-semibold text-gray-700 mb-2">No documents yet</h3>
          <p className="text-gray-400 text-sm">
            Uploaded documents will appear here categorised by kind.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {KIND_ORDER.filter((k) => grouped[k].length > 0).map((kind) => (
            <div key={kind} className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <span className="text-xl">{KIND_ICONS[kind]}</span>
                <h2 className="font-semibold text-gray-900">{KIND_LABELS[kind]}</h2>
                <span className="text-xs text-gray-500 ml-auto">
                  {grouped[kind].length} file{grouped[kind].length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {grouped[kind].map((d) => (
                  <li key={d.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{d.title}</p>
                      <p className="text-xs text-gray-400">
                        Uploaded {formatDate(d.uploadedAt)}
                        {d.uploadedBy && <> by {d.uploadedBy.fullName}</>}
                      </p>
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost text-sm"
                    >
                      Open →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
