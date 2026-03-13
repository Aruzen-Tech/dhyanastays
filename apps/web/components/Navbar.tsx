'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (href: string) =>
    pathname === href ? 'text-brand-700 font-semibold' : 'text-gray-600 hover:text-brand-700';

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

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={`text-sm transition-colors ${isActive('/')}`}>
              Discover
            </Link>

            {user?.role === 'HOST' && (
              <>
                <Link
                  href="/host/listings/new"
                  className={`text-sm transition-colors ${isActive('/host/listings/new')}`}
                >
                  + New Listing
                </Link>
                <Link
                  href="/host/payouts"
                  className={`text-sm transition-colors ${isActive('/host/payouts')}`}
                >
                  Payouts
                </Link>
              </>
            )}

            {user?.role === 'GUEST' && (
              <Link
                href="/dashboard"
                className={`text-sm transition-colors ${isActive('/dashboard')}`}
              >
                My Bookings
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <Link
                  href="/admin/listings"
                  className={`text-sm transition-colors ${isActive('/admin/listings')}`}
                >
                  Approvals
                </Link>
                <Link
                  href="/admin/bookings"
                  className={`text-sm transition-colors ${isActive('/admin/bookings')}`}
                >
                  Bookings
                </Link>
                <Link
                  href="/admin/payouts"
                  className={`text-sm transition-colors ${isActive('/admin/payouts')}`}
                >
                  Payouts
                </Link>
              </>
            )}
          </div>

          {/* Auth actions */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <span className="spinner text-brand-700" />
            ) : user ? (
              <>
                <Link href="/dashboard" className="btn-ghost text-sm">
                  <span className="hidden sm:inline">{user.email}</span>
                  <span className="sm:hidden">Dashboard</span>
                </Link>
                <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost text-sm">
                  Sign in
                </Link>
                <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
