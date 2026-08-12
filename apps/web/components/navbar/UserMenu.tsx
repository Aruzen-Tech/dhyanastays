'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import AdminNotificationBell from '../AdminNotificationBell';
import AdminSearchOverlay from '../AdminSearchOverlay';
import GuestNotificationBell from '../GuestNotificationBell';
import HostNotificationBell from '../HostNotificationBell';
import AccountMenu from './AccountMenu';
import ThemeToggleButton from './ThemeToggleButton';

/**
 * Desktop right-side cluster: [Search] [Notification] [Avatar] [Sign out].
 * Search/notification are the existing, unchanged role-gated components.
 * The avatar (AccountMenu) opens a dropdown holding the email and the
 * theme control — replacing the old standalone truncated-email link and
 * standalone ThemeToggle icon, both removed from here. Sign out stays
 * directly in the header, outside the dropdown, per spec — it shares the
 * exact same logout+redirect sequence as the mobile drawer's Sign-out
 * button via the useLogout() hook, not a second copy of that logic.
 */
export default function UserMenu() {
  const { user, isLoading } = useAuth();
  const handleLogout = useLogout();

  return (
    <div className="flex items-center gap-2">
      {user?.role === 'GUEST' && (
        <div className="hidden sm:flex">
          <GuestNotificationBell />
        </div>
      )}
      {user?.role === 'HOST' && (
        <div className="hidden sm:flex">
          <HostNotificationBell />
        </div>
      )}
      {user?.role === 'ADMIN' && (
        <div className="hidden sm:flex items-center gap-1">
          <AdminSearchOverlay />
          <AdminNotificationBell />
        </div>
      )}

      {isLoading ? (
        <span className="spinner text-brand-700" />
      ) : user ? (
        <div className="hidden sm:flex items-center gap-3">
          <AccountMenu />
          <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
            Sign out
          </button>
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-3">
          {/* Signed-out visitors have no AccountMenu (it only renders for a
              logged-in user), so the theme control needs its own reachable
              spot in the header rather than being reachable only after
              signing in. */}
          <ThemeToggleButton />
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">Get started</Link>
          </div>
        </div>
      )}
    </div>
  );
}
