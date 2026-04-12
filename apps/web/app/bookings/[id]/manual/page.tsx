'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { bookingsApi } from '../../../../lib/api';
import type { BookingManual } from '../../../../lib/types';

export default function ManualPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<BookingManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<number | null>(0);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    bookingsApi
      .getManual(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Cannot access property manual</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  const manual = data?.propertyManual;

  if (!manual || !manual.sections || manual.sections.length === 0) {
    return (
      <div className="container-page py-16 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">📖</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No property manual yet</h2>
        <p className="text-gray-400 text-sm mb-6">
          The host hasn&apos;t added a property manual for this listing yet.
        </p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-4 inline-block">
          ← Back to booking
        </Link>
        <h1 className="page-title">Property Manual</h1>
        {data?.listingTitle && (
          <p className="text-gray-500 text-sm mt-1">{data.listingTitle}</p>
        )}
      </div>

      <div className="space-y-3">
        {manual.sections.map((section, i) => (
          <div key={i} className="card overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === i ? null : i)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <h2 className="font-semibold text-gray-900">{section.title}</h2>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${openSection === i ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSection === i && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">{section.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
