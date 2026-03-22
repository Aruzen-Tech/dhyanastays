'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminNotificationBell from './AdminNotificationBell';
import AdminSearchOverlay from './AdminSearchOverlay';

export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push('/');
  };

  const isActive = (href: string) =>
    pathname === href ? 'text-brand-700 font-semibold' : 'text-gray-600 hover:text-brand-700';

  const isActivePrefix = (prefix: string) =>
    pathname.startsWith(prefix) ? 'text-brand-700 font-semibold' : 'text-gray-600 hover:text-brand-700';

  const navLinks = (
    <>
      <Link href="/" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/')}`}>
        Discover
      </Link>
      {user?.role === 'HOST' && (
        <>
          <Link href="/host/listings/new" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/host/listings/new')}`}>
            + New Listing
          </Link>
          <Link href="/host/payouts" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/host/payouts')}`}>
            Payouts
          </Link>
        </>
      )}
      {user?.role === 'GUEST' && (
        <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/dashboard')}`}>
          My Bookings
        </Link>
      )}
      {user?.role === 'ADMIN' && (
        <>
          <Link href="/admin" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin')}`}>
            Dashboard
          </Link>
          <Link href="/admin/listings" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin/listings')}`}>
            Approvals
          </Link>
          <Link href="/admin/bookings" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin/bookings')}`}>
            Bookings
          </Link>
          <Link href="/admin/analytics" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin/analytics')}`}>
            Analytics
          </Link>

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setAdminMenuOpen((o) => !o)}
              className={`text-sm transition-colors flex items-center gap-1 ${
                ['/admin/payouts', '/admin/users', '/admin/refunds', '/admin/calendar', '/admin/settings', '/admin/activity', '/admin/rate-limits', '/admin/forecast', '/admin/hosts/performance'].some((p) => pathname.startsWith(p))
                  ? 'text-brand-700 font-semibold'
                  : 'text-gray-600 hover:text-brand-700'
              }`}
            >
              More
              <svg className={`w-3 h-3 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {adminMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAdminMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  {[
                    { href: '/admin/payouts', label: 'Payouts' },
                    { href: '/admin/users', label: 'Users' },
                    { href: '/admin/refunds', label: 'Refunds' },
                    { href: '/admin/calendar', label: 'Calendar' },
                    { href: '/admin/hosts/performance', label: 'Host Performance' },
                    { href: '/admin/activity', label: 'Admin Activity' },
                    { href: '/admin/forecast', label: 'Revenue Forecast' },
                    { href: '/admin/rate-limits', label: 'Rate Limits' },
                    { href: '/admin/settings', label: 'Settings' },
                    { href: '/admin/audit', label: 'Audit Log' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setAdminMenuOpen(false); setMenuOpen(false); }}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        pathname === item.href
                          ? 'text-brand-700 bg-brand-50 font-medium'
                          : 'text-gray-600 hover:text-brand-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="container-page">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🏡</span>
            <span className="font-bold text-brand-700 text-lg tracking-tight group-hover:text-brand-800 transition-colors">
              Dhyana Stays
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks}
          </div>

          {/* Auth actions + admin tools + hamburger */}
          <div className="flex items-center gap-3">
            {/* Admin search + notifications */}
            {user?.role === 'ADMIN' && (
              <div className="hidden sm:flex items-center gap-1">
                <AdminSearchOverlay />
                <AdminNotificationBell />
              </div>
            )}

            {isLoading ? (
              <span className="spinner text-brand-700" />
            ) : user ? (
              <>
                <Link href="/dashboard" className="hidden sm:inline-flex btn-ghost text-sm">
                  {user.email}
                </Link>
                <button onClick={handleLogout} className="hidden sm:inline-flex btn-secondary text-sm py-2 px-4">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="hidden sm:inline-flex btn-ghost text-sm">
                  Sign in
                </Link>
                <Link href="/auth/register" className="hidden sm:inline-flex btn-primary text-sm py-2 px-4">
                  Get started
                </Link>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="17" y2="6" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="14" x2="17" y2="14" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4">
          {navLinks}

          {/* Mobile admin tools */}
          {user?.role === 'ADMIN' && (
            <div className="sm:hidden flex items-center gap-2 py-2 border-t border-gray-100">
              <AdminSearchOverlay />
              <AdminNotificationBell />
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
            {isLoading ? null : user ? (
              <>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <button onClick={handleLogout} className="btn-secondary text-sm w-full">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="btn-ghost text-sm w-full">
                  Sign in
                </Link>
                <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm w-full">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
