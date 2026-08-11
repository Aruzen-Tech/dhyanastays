'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

/**
 * The shared logout sequence — call the existing logout(), run an optional
 * caller-supplied cleanup (e.g. closing a menu), then redirect home. Both
 * the mobile drawer's auth block and the desktop account menu's Sign-out
 * button use this, so there's exactly one place that knows the sequence;
 * the underlying auth logic itself (AuthContext.logout) is untouched.
 */
export function useLogout(onComplete?: () => void) {
  const { logout } = useAuth();
  const router = useRouter();

  return async () => {
    await logout();
    onComplete?.();
    router.push('/');
  };
}
