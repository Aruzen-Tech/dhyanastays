'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFeatures } from '../context/FeatureContext';
import AdminNotificationBell from './AdminNotificationBell';
import AdminSearchOverlay from './AdminSearchOverlay';
import GuestNotificationBell from './GuestNotificationBell';
import HostNotificationBell from './HostNotificationBell';

/* ── Dark / Light toggle ─────────────────────────────────────────────────── */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    setSpinning(true);
    toggleTheme();
    setTimeout(() => setSpinning(false), 500);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={`
        relative w-9 h-9 rounded-xl flex items-center justify-center
        bg-gray-100 hover:bg-gray-200 text-gray-600
        transition-all duration-200 active:scale-90
        ${spinning ? 'animate-theme-toggle' : ''}
      `}
    >
      {theme === 'light' ? (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}

/* ── Main Navbar ─────────────────────────────────────────────────────────── */
export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const { isEnabled } = useFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const [investorMenuOpen, setInvestorMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push('/');
  };

  const isActive = (href: string) =>
    pathname === href
      ? 'text-brand-700 font-semibold'
      : 'text-gray-500 hover:text-brand-700';

  const isActivePrefix = (prefix: string) =>
    pathname.startsWith(prefix)
      ? 'text-brand-700 font-semibold'
      : 'text-gray-500 hover:text-brand-700';

  const navLinks = (
    <>
      <Link href="/" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/')}`}>
        Discover
      </Link>
      <Link href="/experiences" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActivePrefix('/experiences')}`}>
        Experiences
      </Link>

      {/* ── HOST links ── */}
      {user?.role === 'HOST' && (
        <>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/dashboard')}`}>
            Dashboard
          </Link>
          <Link href="/host/bookings" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/host/bookings')}`}>
            Bookings
          </Link>
          <Link href="/host/analytics" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/host/analytics')}`}>
            Analytics
          </Link>

          <div className="relative">
            <button
              onClick={() => setHostMenuOpen(o => !o)}
              className={`text-sm transition-colors flex items-center gap-1 ${
                ['/host/payouts','/host/listings/new','/host/calendar','/host/performance','/host/forecast','/host/messages','/host/issues','/host/quick-replies','/host/experiences','/host/control-panel']
                  .some(p => pathname.startsWith(p)) ? 'text-brand-700 font-semibold' : 'text-gray-500 hover:text-brand-700'
              }`}
            >
              More
              <svg className={`w-3 h-3 transition-transform ${hostMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {hostMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setHostMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-48 rounded-2xl py-2 z-50 glass-card animate-scale-in">
                  {[
                    { href: '/host/control-panel', label: '🎛 Control Panel' },
                    { href: '/host/listings/new', label: '+ New Listing' },
                    { href: '/host/experiences',  label: 'Experiences' },
                    { href: '/host/messages',     label: 'Messages' },
                    { href: '/host/quick-replies', label: 'Quick Replies' },
                    { href: '/host/issues',        label: 'Guest Issues' },
                    { href: '/host/payouts',       label: 'Payouts' },
                    { href: '/host/calendar',      label: 'Calendar' },
                    { href: '/host/performance',   label: 'Performance' },
                    { href: '/host/forecast',      label: 'Forecast' },
                  ].map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setHostMenuOpen(false); setMenuOpen(false); }}
                      className={`block px-4 py-2 text-sm transition-colors rounded-lg mx-1 ${
                        pathname === item.href
                          ? 'text-brand-700 bg-brand-50 font-medium'
                          : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
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

      {/* ── GUEST links ── */}
      {user?.role === 'GUEST' && (
        <>
          <Link href="/dashboard"         onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/dashboard')}`}>My Bookings</Link>
          {isEnabled('sos') && (
            <Link href="/sos"               onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-red-600 hover:text-red-700" title="Emergency SOS">
              🆘 SOS
            </Link>
          )}
          <Link href="/guest/wishlist"    onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/guest/wishlist')}`}>Wishlist</Link>
          {isEnabled('stay_pass') && (
            <Link href="/passport"        onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/passport')}`}>Passport</Link>
          )}
          {isEnabled('guest_host_messaging') && (
            <Link href="/guest/messages"    onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActivePrefix('/guest/messages')}`}>Messages</Link>
          )}
          {isEnabled('membership') && (
            <Link href="/guest/membership"  onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActivePrefix('/guest/membership')}`}>Membership</Link>
          )}

          <div className="relative">
            <button
              onClick={() => setGuestMenuOpen(o => !o)}
              className={`text-sm transition-colors flex items-center gap-1 ${
                ['/guest/sip','/guest/loyalty','/guest/referrals','/guest/preferences','/guest/notifications','/guest/profile','/guest/experiences','/guest/sos','/trip-groups','/itineraries']
                  .some(p => pathname.startsWith(p)) ? 'text-brand-700 font-semibold' : 'text-gray-500 hover:text-brand-700'
              }`}
            >
              More
              <svg className={`w-3 h-3 transition-transform ${guestMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {guestMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setGuestMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-48 rounded-2xl py-2 z-50 glass-card animate-scale-in">
                  {[
                    { href: '/guest/experiences', label: 'My Experiences', feature: 'experiences' },
                    { href: '/trip-groups',       label: 'Trip Groups', feature: 'trip_groups' },
                    { href: '/itineraries',       label: 'AI Itineraries', feature: 'ai_itinerary' },
                    { href: '/guest/sos',         label: 'SOS History', feature: 'sos' },
                    { href: '/guest/sip',         label: 'Trip Savings SIP', feature: 'membership' },
                    { href: '/guest/loyalty',     label: 'Loyalty', feature: 'membership' },
                    { href: '/guest/referrals',   label: 'Referrals', feature: 'referrals' },
                    { href: '/guest/preferences', label: 'Preferences' },
                    { href: '/guest/notifications', label: 'Notifications' },
                    { href: '/guest/trusted-contacts', label: 'Trusted Contacts', feature: 'sos' },
                    { href: '/guest/profile',     label: 'Profile' },
                  ].filter(item => !item.feature || isEnabled(item.feature)).map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setGuestMenuOpen(false); setMenuOpen(false); }}
                      className={`block px-4 py-2 text-sm transition-colors rounded-lg mx-1 ${
                        pathname === item.href
                          ? 'text-brand-700 bg-brand-50 font-medium'
                          : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
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

      {/* ── INVESTOR kind (shown alongside role-based links) ── */}
      {user?.kind === 'INVESTOR' && user.role !== 'ADMIN' && (
        <>
          <Link href="/investor/portfolio" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/investor/portfolio')}`}>
            Portfolio
          </Link>
          <Link href="/investor/distributions" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActivePrefix('/investor/distributions')}`}>
            Distributions
          </Link>

          <div className="relative">
            <button
              onClick={() => setInvestorMenuOpen(o => !o)}
              className={`text-sm transition-colors flex items-center gap-1 ${
                ['/investor/capital-calls','/investor/documents']
                  .some(p => pathname.startsWith(p)) ? 'text-brand-700 font-semibold' : 'text-gray-500 hover:text-brand-700'
              }`}
            >
              More
              <svg className={`w-3 h-3 transition-transform ${investorMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {investorMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setInvestorMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-48 rounded-2xl py-2 z-50 glass-card animate-scale-in">
                  {[
                    { href: '/investor/capital-calls', label: 'Capital Calls' },
                    { href: '/investor/documents',     label: 'Documents' },
                  ].map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setInvestorMenuOpen(false); setMenuOpen(false); }}
                      className={`block px-4 py-2 text-sm transition-colors rounded-lg mx-1 ${
                        pathname === item.href
                          ? 'text-brand-700 bg-brand-50 font-medium'
                          : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
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

      {/* ── ADMIN links ── */}
      {user?.role === 'ADMIN' && (
        <>
          <Link href="/admin"          onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin')}`}>Dashboard</Link>
          <Link href="/admin/listings" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin/listings')}`}>Approvals</Link>
          <Link href="/admin/bookings" onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin/bookings')}`}>Bookings</Link>
          <Link href="/admin/analytics"onClick={() => setMenuOpen(false)} className={`text-sm transition-colors ${isActive('/admin/analytics')}`}>Analytics</Link>

          <div className="relative">
            <button
              onClick={() => setAdminMenuOpen(o => !o)}
              className={`text-sm transition-colors flex items-center gap-1 ${
                ['/admin/payouts','/admin/users','/admin/refunds','/admin/calendar','/admin/settings','/admin/activity','/admin/rate-limits','/admin/forecast','/admin/hosts/performance','/admin/messages','/admin/issues','/admin/addons','/admin/service-providers','/admin/audit','/admin/sos','/admin/concierge','/admin/investor','/admin/staff','/admin/experiences','/admin/control-panel']
                  .some(p => pathname.startsWith(p)) ? 'text-brand-700 font-semibold' : 'text-gray-500 hover:text-brand-700'
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
                <div className="absolute top-full right-0 mt-2 w-52 rounded-2xl py-2 z-50 glass-card animate-scale-in">
                  {[
                    { href: '/admin/control-panel',     label: '🎛 Control Panel' },
                    { href: '/admin/sos',               label: '🆘 SOS Console' },
                    { href: '/admin/concierge',         label: 'Concierge Chats' },
                    { href: '/admin/experiences',       label: 'Experience Moderation' },
                    { href: '/admin/investor/investments', label: 'Investors' },
                    { href: '/admin/staff',             label: 'Staff' },
                    { href: '/admin/staff/applications', label: 'Staff Applications' },
                    { href: '/admin/messages',         label: 'Messages' },
                    { href: '/admin/issues',            label: 'Guest Issues' },
                    { href: '/admin/addons',            label: 'Add-ons' },
                    { href: '/admin/service-providers', label: 'Service Providers' },
                    { href: '/admin/payouts',           label: 'Payouts' },
                    { href: '/admin/users',             label: 'Users' },
                    { href: '/admin/refunds',           label: 'Refunds' },
                    { href: '/admin/calendar',          label: 'Calendar' },
                    { href: '/admin/hosts/performance', label: 'Host Performance' },
                    { href: '/admin/activity',          label: 'Admin Activity' },
                    { href: '/admin/forecast',          label: 'Revenue Forecast' },
                    { href: '/admin/rate-limits',       label: 'Rate Limits' },
                    { href: '/admin/settings',          label: 'Settings' },
                    { href: '/admin/audit',             label: 'Audit Log' },
                  ].map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setAdminMenuOpen(false); setMenuOpen(false); }}
                      className={`block px-4 py-2 text-sm transition-colors rounded-lg mx-1 ${
                        pathname === item.href
                          ? 'text-brand-700 bg-brand-50 font-medium'
                          : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
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
    <header className="sticky top-0 z-50 glass-nav">
      <div className="container-page">
        <nav className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-sm">🏡</span>
            </div>
            <span
              className="font-bold text-brand-700 text-lg tracking-tight group-hover:opacity-80 transition-opacity"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Dhyana Stays
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Role-specific notification bells */}
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

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Auth actions */}
            {isLoading ? (
              <span className="spinner text-brand-700" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex btn-ghost text-sm max-w-[160px] truncate"
                >
                  {user.email}
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-flex btn-secondary text-sm py-2 px-4"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login"    className="hidden sm:inline-flex btn-ghost text-sm">Sign in</Link>
                <Link href="/auth/register" className="hidden sm:inline-flex btn-primary text-sm py-2 px-4">Get started</Link>
              </>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
              aria-label="Toggle menu"
            >
              <div className="w-4 h-3 flex flex-col justify-between">
                <span className={`block h-0.5 bg-current rounded transition-all origin-center ${menuOpen ? 'rotate-45 translate-y-[5.5px]' : ''}`} />
                <span className={`block h-0.5 bg-current rounded transition-all ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
                <span className={`block h-0.5 bg-current rounded transition-all origin-center ${menuOpen ? '-rotate-45 -translate-y-[5.5px]' : ''}`} />
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white animate-slide-down">
          <div className="container-page py-4 flex flex-col gap-1">
            {/* Nav links as stacked rows */}
            <div className="flex flex-col gap-0.5">
              {navLinks}
            </div>

            {/* Role-specific tools */}
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

            <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2">
              {isLoading ? null : user ? (
                <>
                  <p className="text-xs text-gray-400 truncate px-1">{user.email}</p>
                  <button onClick={handleLogout} className="btn-secondary text-sm w-full">Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/auth/login"    onClick={() => setMenuOpen(false)} className="btn-ghost text-sm w-full">Sign in</Link>
                  <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm w-full">Get started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
