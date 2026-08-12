'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLogout } from '../../hooks/useLogout';

interface Props {
  /** Called after any navigating action (e.g. to close the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * The mobile drawer's auth block: email+Sign-out, or Sign-in+Get-started.
 * Desktop now uses AccountMenu (avatar + dropdown) plus a standalone
 * Sign-out button instead (see UserMenu.tsx) — this component's own former
 * "inline" desktop variant is gone, since nothing calls it anymore; this is
 * purely the mobile "stacked" layout now. Shares the exact logout+redirect
 * sequence with the desktop Sign-out button via useLogout(), not a second
 * copy of it.
 */
export default function AuthActions({ onNavigate }: Props) {
  const { user, isLoading } = useAuth();
  const handleLogout = useLogout(onNavigate);

  if (isLoading) return null;

  if (user) {
    return (
      <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2">
        <p className="text-xs text-gray-400 truncate px-1" title={user.email}>
          {user.email}
        </p>
        <button onClick={handleLogout} className="btn-secondary text-sm w-full">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2">
      <Link href="/auth/login" onClick={onNavigate} className="btn-ghost text-sm w-full">Sign in</Link>
      <Link href="/auth/register" onClick={onNavigate} className="btn-primary text-sm w-full">Get started</Link>
    </div>
  );
}
