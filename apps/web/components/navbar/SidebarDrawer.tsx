'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import BrandMark from '../BrandMark';
import { useAuth } from '../../context/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import type { NavItem } from '../../lib/navigation';
import NavigationItem from './NavigationItem';
import AuthActions from './AuthActions';
import ThemeToggleButton from './ThemeToggleButton';
import AdminNotificationBell from '../AdminNotificationBell';
import GuestNotificationBell from '../GuestNotificationBell';
import HostNotificationBell from '../HostNotificationBell';

interface Props {
  items: NavItem[];
  pathname: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Off-canvas navigation drawer, revealed by the top-bar ⋯ button. One drawer
 * for every breakpoint — it replaces the old measured desktop overflow row
 * and the separate mobile drawer, so the two can't drift. Consumes the same
 * `buildNavItems()` array (single source of truth) and renders `NavigationItem`.
 *
 * The portal stays mounted; visibility is driven by `open` (panel translate +
 * scrim opacity + pointer-events) so it slides in AND out smoothly. Locks page
 * scroll while open, closes on Escape / scrim / item click (via onClose).
 */
export default function SidebarDrawer({ items, pathname, open, onClose }: Props) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`glass absolute inset-y-0 left-0 w-[300px] max-w-[86vw] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200/60 shrink-0">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5 group">
            <BrandMark size={30} />
            <span className="font-bold text-brand-700 tracking-tight">Dhyana Stays</span>
          </Link>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 flex flex-col gap-1">
          {items.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              pathname={pathname}
              variant="mobile"
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Account section — mirrors the top-bar UserMenu on small screens
            (where UserMenu's contents are hidden). */}
        <div className="border-t border-gray-200/60 px-3 py-3 shrink-0">
          <div className="sm:hidden flex items-center gap-2 mb-2">
            {user?.role === 'GUEST' && <GuestNotificationBell />}
            {user?.role === 'HOST' && <HostNotificationBell />}
            {user?.role === 'ADMIN' && <AdminNotificationBell />}
            <ThemeToggleButton />
          </div>
          <AuthActions onNavigate={onClose} />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
