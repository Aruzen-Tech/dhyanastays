'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useFeature } from '../context/FeatureContext';

/**
 * Always-reachable emergency SOS floating action button. Shows only for
 * authenticated guests when the `sos` feature is on, and hides on the SOS
 * pages themselves. Links to the existing tiered `/sos` trigger flow (safer
 * than a one-tap trigger). Bottom-left so it never collides with the
 * assistant launcher (bottom-right). Hidden in print.
 */
export default function SosFab() {
  const { user } = useAuth();
  const sosEnabled = useFeature('sos');
  const pathname = usePathname();

  if (!user || user.role !== 'GUEST' || !sosEnabled) return null;
  if (pathname.startsWith('/sos')) return null;

  return (
    <Link
      href="/sos"
      aria-label="Emergency SOS"
      title="Emergency SOS"
      className="no-print fixed bottom-5 left-5 z-40 group focus:outline-none"
    >
      <span
        className="absolute inset-0 rounded-full bg-red-500/40 animate-pulse-ring"
        aria-hidden="true"
      />
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-red-600 text-white text-sm font-bold shadow-lg hover:bg-red-700 active:scale-95 transition-all group-focus-visible:ring-2 group-focus-visible:ring-red-500/50 group-focus-visible:ring-offset-2">
        SOS
      </span>
    </Link>
  );
}
