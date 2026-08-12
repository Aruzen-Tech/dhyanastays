'use client';

import { useAuth } from '../../context/AuthContext';
import type { NavItem } from '../../lib/navigation';
import AdminNotificationBell from '../AdminNotificationBell';
import AdminSearchOverlay from '../AdminSearchOverlay';
import GuestNotificationBell from '../GuestNotificationBell';
import HostNotificationBell from '../HostNotificationBell';
import AuthActions from './AuthActions';
import NavigationItem from './NavigationItem';

interface Props {
  items: NavItem[];
  pathname: string;
  onClose: () => void;
}

/**
 * Full-height drawer — a flat, un-collapsed render of the same `items`
 * array DesktopNavigation measures, so mobile and desktop always show an
 * identical content set. No overflow logic here at all; that's strictly a
 * desktop/tablet concern.
 *
 * `fixed inset-x-0 top-16 bottom-0` (rather than sitting inline in normal
 * document flow, pushing the page below it further down) makes this a true
 * overlay: it fully covers everything from the bottom of the sticky header
 * (h-16 = 4rem) to the bottom of the viewport, so the page behind it is
 * completely hidden, not just scrolled-past. `overflow-y-auto` on this same
 * element is its internal scroll region — bounded automatically by the
 * fixed top/bottom anchors, no separate max-height calculation needed. The
 * caller (Navbar.tsx) pairs this with useScrollLock(mobileOpen) so the page
 * behind can't scroll at all while this is open; without that, this being
 * `fixed` would otherwise let a touch-drag "fall through" to the page.
 */
export default function MobileNavigation({ items, pathname, onClose }: Props) {
  const { user } = useAuth();

  return (
    <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto overscroll-contain border-t border-gray-200 bg-white animate-slide-down">
      <div className="container-page py-4 flex flex-col gap-1">
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <NavigationItem key={item.id} item={item} pathname={pathname} variant="mobile" onClick={onClose} />
          ))}
        </div>

        {user?.role === 'GUEST' && (
          <div className="sm:hidden flex items-center gap-2 pt-3 mt-2 border-t border-gray-100">
            <GuestNotificationBell />
          </div>
        )}
        {user?.role === 'HOST' && (
          <div className="sm:hidden flex items-center gap-2 pt-3 mt-2 border-t border-gray-100">
            <HostNotificationBell />
          </div>
        )}
        {user?.role === 'ADMIN' && (
          <div className="sm:hidden flex items-center gap-2 pt-3 mt-2 border-t border-gray-100">
            <AdminSearchOverlay />
            <AdminNotificationBell />
          </div>
        )}

        <AuthActions onNavigate={onClose} />
      </div>
    </div>
  );
}
