'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/* ── "More" dropdown item lists (unchanged data — same links, same order,
   same feature gates — hoisted only so the grid layout below can size itself
   off `.length`). ──────────────────────────────────────────────────────── */
const HOST_MORE_ITEMS = [
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
];

const GUEST_MORE_ITEMS = [
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
];

const INVESTOR_MORE_ITEMS = [
  { href: '/investor/capital-calls', label: 'Capital Calls' },
  { href: '/investor/documents',     label: 'Documents' },
];

const ADMIN_MORE_ITEMS = [
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
];

/* Route prefixes that mark each role's "More" trigger active — hoisted so
   both the always-full mobile list and the responsive desktop list (which
   also needs to know when a demoted item is active) read the same data. */
const HOST_TRIGGER_PREFIXES = ['/host/payouts','/host/listings/new','/host/calendar','/host/performance','/host/forecast','/host/messages','/host/issues','/host/quick-replies','/host/experiences','/host/control-panel'];
const GUEST_TRIGGER_PREFIXES = ['/guest/sip','/guest/loyalty','/guest/referrals','/guest/preferences','/guest/notifications','/guest/profile','/guest/experiences','/guest/sos','/trip-groups','/itineraries'];
const INVESTOR_TRIGGER_PREFIXES = ['/investor/capital-calls','/investor/documents'];
const ADMIN_TRIGGER_PREFIXES = ['/admin/payouts','/admin/users','/admin/refunds','/admin/calendar','/admin/settings','/admin/activity','/admin/rate-limits','/admin/forecast','/admin/hosts/performance','/admin/messages','/admin/issues','/admin/addons','/admin/service-providers','/admin/audit','/admin/sos','/admin/concierge','/admin/investor','/admin/staff','/admin/experiences','/admin/control-panel'];

/** A handful of items stays a single narrow column (matches the original
 * sizing — nothing to reorganize there); once it's long enough to feel like
 * a list, step up to 2 columns, then 3 for the longest ones (Admin). Keeps
 * the dropdown balanced instead of one tall, cramped column. Width is also
 * returned as a plain number (matching the Tailwind class below) so the
 * positioning logic can clamp the panel to the viewport without needing to
 * measure the rendered DOM first. */
function moreMenuClass(itemCount: number): string {
  if (itemCount > 8) return 'grid grid-cols-3 w-[620px] gap-x-1.5 gap-y-1 p-3';
  if (itemCount > 4) return 'grid grid-cols-2 w-[400px] gap-x-1.5 gap-y-1 p-3';
  return 'w-48 py-3 px-1.5';
}
function moreMenuWidthPx(itemCount: number): number {
  if (itemCount > 8) return 620;
  if (itemCount > 4) return 400;
  return 192; // w-48
}

interface MoreMenuItem {
  href: string;
  label: string;
}

/**
 * The "More" trigger + dropdown panel, shared by all four role-specific
 * menus (same markup/behavior every one of them used to duplicate).
 *
 * The panel is portaled to document.body and positioned with fixed
 * coordinates computed from the trigger's own bounding box, rather than
 * `absolute` positioned inside the trigger's normal DOM position. This is
 * necessary, not cosmetic: the trigger lives inside the horizontally
 * scrollable nav strip (`overflow-x-auto`), and per the CSS Overflow spec, a
 * container with non-`visible` overflow on one axis has its other axis
 * forced to non-`visible` too — so a plain `absolute` dropdown hanging below
 * the trigger gets silently clipped by the strip's own scroll box, even
 * though its geometry still measures correctly. Portaling escapes that
 * clipping the same way the Explore Stays filter drawer had to.
 */
function MoreMenu({
  items,
  isOpen,
  onToggle,
  onClose,
  triggerActive,
  pathname,
  onItemClick,
}: {
  items: MoreMenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerActive: boolean;
  pathname: string;
  onItemClick: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number; maxHeight: number } | null>(null);

  const handleToggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const margin = 8;
      // Fixed panel offset from the viewport top, matching the navbar's own
      // rendered height (h-16 = 64px, plus its 1px bottom border under
      // fractional/subpixel layout).
      const top = 64.6667;
      const maxHeight = Math.max(200, Math.min(window.innerHeight * 0.76, window.innerHeight - top - margin));
      const panelWidth = moreMenuWidthPx(items.length);
      // Anchor the panel's right edge to the trigger's right edge (matches
      // the original right-0 look) — but a "More" button sitting away from
      // the right edge, combined with a wide 2/3-column panel, would push
      // part of the panel off-screen. Clamp so it never extends past
      // `margin` from either edge.
      const idealRight = window.innerWidth - rect.right;
      const leftEdgeIfIdeal = window.innerWidth - idealRight - panelWidth;
      const right = leftEdgeIfIdeal < margin ? window.innerWidth - panelWidth - margin : idealRight;
      setPos({ top, right: Math.max(margin, right), maxHeight });
    }
    onToggle();
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={`text-sm transition-colors flex items-center gap-1 whitespace-nowrap ${
          triggerActive ? 'text-brand-700 font-semibold' : 'text-gray-500 hover:text-brand-700'
        }`}
      >
        More
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div
            style={{ top: pos.top, right: pos.right, maxWidth: 'calc(100vw - 16px)', maxHeight: pos.maxHeight }}
            className={`fixed overflow-y-auto overscroll-contain scrollbar-hide rounded-2xl z-50 bg-white border border-gray-200 shadow-2xl animate-scale-in ${moreMenuClass(items.length)}`}
          >
            {items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={`block px-3 py-2.5 rounded-lg text-sm transition-colors truncate ${
                  pathname === item.href
                    ? 'text-brand-700 bg-brand-50 font-medium'
                    : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

/**
 * The mobile equivalent of `MoreMenu`: instead of a floating desktop-style
 * popup (which — per the CSS Filter Effects spec — can't portal-escape a
 * `backdrop-filter` ancestor's containing block the same way `overflow`
 * ancestors can, since the drawer itself already portals past that), this
 * expands the role's tools inline within the drawer's own scrollable flow.
 * Same items/hrefs/active-state semantics as MoreMenu, just presented as an
 * accordion instead of a positioned panel.
 */
function MobileMoreSection({
  items,
  isOpen,
  onToggle,
  triggerActive,
  pathname,
  onItemClick,
}: {
  items: MoreMenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  triggerActive: boolean;
  pathname: string;
  onItemClick: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-base transition-colors ${
          triggerActive ? 'text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        More
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-0.5 mb-1 ml-3 pl-3 border-l-2 border-gray-200 flex flex-col gap-0.5">
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'text-brand-700 bg-brand-50 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Logo mark ────────────────────────────────────────────────────────────
   Gradient ids are suffixed with useId() so the two places this renders at
   once (the header itself, plus the mobile drawer's own header while it's
   open) never collide — duplicate SVG gradient ids resolve unreliably
   across browsers when more than one copy is in the DOM simultaneously. */
function Logo() {
  const uid = useId();
  const swirlId = `dhyana-swirl-${uid}`;
  const topleafId = `dhyana-topleaf-${uid}`;
  const leafId = `dhyana-leaf-${uid}`;

  return (
    <span className="transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-3">
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={swirlId} x1="10" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#B7D8B0" />
            <stop offset="0.55" stopColor="#6FA968" />
            <stop offset="1" stopColor="#2F6B33" />
          </linearGradient>
          <linearGradient id={topleafId} x1="50" y1="8" x2="92" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#EAF4E6" />
            <stop offset="1" stopColor="#BCD9B4" />
          </linearGradient>
          <linearGradient id={leafId} x1="0" y1="0" x2="20" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#67B05F" />
            <stop offset="1" stopColor="#2F7D33" />
          </linearGradient>
        </defs>
        <path d="M63 12 A 40 40 0 1 0 88 55" stroke={`url(#${swirlId})`} strokeWidth="7" strokeLinecap="round" />
        <path d="M22 30 A 34 34 0 0 0 20 62" stroke="#2F6B33" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
        <path d="M46 16 C 58 2 84 4 93 14 C 90 32 66 42 52 32 C 48 28 45 22 46 16 Z" fill={`url(#${topleafId})`} />
        <path d="M50 28 C 62 24 76 18 89 12" stroke="#5E8F58" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M18 26 C 12 16 22 8 32 10 C 34 20 28 28 18 26 Z" fill={`url(#${leafId})`} />
        <path d="M34 24 C 32 16 40 12 47 14 C 47 21 42 26 34 24 Z" fill="#6FB667" />
        <path d="M78 62 C 88 58 96 66 95 74 C 86 78 78 72 78 62 Z" fill={`url(#${leafId})`} />
        <path d="M70 72 C 78 70 84 76 83 83 C 75 85 69 80 70 72 Z" fill="#6FB667" />
        <g fill="#1E2749">
          <circle cx="50" cy="33.5" r="3.4" />
          <circle cx="50" cy="42" r="6.6" />
          <path d="M50 47 C 43.5 48.5 40.5 54 39.5 62 L 60.5 62 C 59.5 54 56.5 48.5 50 47 Z" />
          <path
            d="M41.5 53 C 37 57 34 61.5 32.5 66.5 M58.5 53 C 63 57 66 61.5 67.5 66.5"
            stroke="#1E2749"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="32.5" cy="66.5" r="2.1" />
          <circle cx="67.5" cy="66.5" r="2.1" />
          <path d="M50 58 C 38 58 29 63 27.5 69.5 C 34 72.5 44 73.5 50 73.5 C 56 73.5 66 72.5 72.5 69.5 C 71 63 62 58 50 58 Z" />
        </g>
      </svg>
    </span>
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
  const [anonMoreOpen, setAnonMoreOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const moreMeasureRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  // Close any open "More" menu whenever the route changes — covers every way
  // it can happen (clicking a primary link, clicking a demoted/tool item
  // inside the dropdown itself, browser back/forward, programmatic
  // navigation) with one check, rather than adding a close-handler to every
  // individual nav link. Only fires on an actual pathname change, so opening
  // "More" itself (which doesn't change the route) is unaffected.
  useEffect(() => {
    setHostMenuOpen(false);
    setGuestMenuOpen(false);
    setAdminMenuOpen(false);
    setInvestorMenuOpen(false);
    setAnonMoreOpen(false);
  }, [pathname]);

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

  // Mobile drawer row styling — touch-friendly block rows (bare `text-sm`
  // inline links look fine in a horizontal desktop bar, but read as cramped
  // in a vertical, tap-driven list). `isActive`/`isActivePrefix` above are
  // shared with the desktop Investor block below, so they stay untouched;
  // this local helper composes the same active check into a taller row.
  const mobileRow = (active: boolean, extra = '') =>
    `block px-3 py-3 rounded-xl text-base transition-colors ${
      active ? 'text-brand-700 font-semibold bg-brand-50' : 'text-gray-700 hover:bg-gray-50'
    } ${extra}`;

  const navLinks = (
    <>
      <Link href="/" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/')}>
        Home
      </Link>
      {/* Explore Stays — the dedicated search/filter/map browsing page. Deliberately
          outside every role block below: visible logged-out and for every role. */}
      <Link href="/stays" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/stays')}>
        Explore Stays
      </Link>
      <Link href="/experiences" onClick={() => setMenuOpen(false)} className={mobileRow(pathname.startsWith('/experiences'))}>
        Experiences
      </Link>
      {/* About Us — company page. Same as above: outside every role block, visible
          logged-out and for every role. */}
      <Link href="/about" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/about')}>
        About Us
      </Link>

      {/* ── HOST links ── */}
      {user?.role === 'HOST' && (
        <>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/dashboard')}>
            Dashboard
          </Link>
          <Link href="/host/bookings" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/host/bookings')}>
            Bookings
          </Link>
          <Link href="/host/analytics" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/host/analytics')}>
            Analytics
          </Link>

          <MobileMoreSection
            items={HOST_MORE_ITEMS}
            isOpen={hostMenuOpen}
            onToggle={() => setHostMenuOpen(o => !o)}
            triggerActive={HOST_TRIGGER_PREFIXES.some(p => pathname.startsWith(p))}
            pathname={pathname}
            onItemClick={() => { setHostMenuOpen(false); setMenuOpen(false); }}
          />
        </>
      )}

      {/* ── GUEST links ── */}
      {user?.role === 'GUEST' && (
        <>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/dashboard')}>My Bookings</Link>
          {isEnabled('sos') && (
            <Link href="/sos" onClick={() => setMenuOpen(false)} className="block px-3 py-3 rounded-xl text-base font-semibold text-red-600 hover:bg-red-50 transition-colors" title="Emergency SOS">
              🆘 SOS
            </Link>
          )}
          <Link href="/guest/wishlist" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/guest/wishlist')}>Wishlist</Link>
          {isEnabled('stay_pass') && (
            <Link href="/passport" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/passport')}>Passport</Link>
          )}
          {isEnabled('guest_host_messaging') && (
            <Link href="/guest/messages" onClick={() => setMenuOpen(false)} className={mobileRow(pathname.startsWith('/guest/messages'))}>Messages</Link>
          )}
          {isEnabled('membership') && (
            <Link href="/guest/membership" onClick={() => setMenuOpen(false)} className={mobileRow(pathname.startsWith('/guest/membership'))}>Membership</Link>
          )}

          <MobileMoreSection
            items={GUEST_MORE_ITEMS.filter(item => !item.feature || isEnabled(item.feature))}
            isOpen={guestMenuOpen}
            onToggle={() => setGuestMenuOpen(o => !o)}
            triggerActive={GUEST_TRIGGER_PREFIXES.some(p => pathname.startsWith(p))}
            pathname={pathname}
            onItemClick={() => { setGuestMenuOpen(false); setMenuOpen(false); }}
          />
        </>
      )}

      {/* ── INVESTOR kind (shown alongside role-based links) ── */}
      {user?.kind === 'INVESTOR' && user.role !== 'ADMIN' && (
        <>
          <Link href="/investor/portfolio" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/investor/portfolio')}>
            Portfolio
          </Link>
          <Link href="/investor/distributions" onClick={() => setMenuOpen(false)} className={mobileRow(pathname.startsWith('/investor/distributions'))}>
            Distributions
          </Link>

          <MobileMoreSection
            items={INVESTOR_MORE_ITEMS}
            isOpen={investorMenuOpen}
            onToggle={() => setInvestorMenuOpen(o => !o)}
            triggerActive={INVESTOR_TRIGGER_PREFIXES.some(p => pathname.startsWith(p))}
            pathname={pathname}
            onItemClick={() => { setInvestorMenuOpen(false); setMenuOpen(false); }}
          />
        </>
      )}

      {/* ── ADMIN links ── */}
      {user?.role === 'ADMIN' && (
        <>
          <Link href="/admin" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/admin')}>Dashboard</Link>
          <Link href="/admin/listings" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/admin/listings')}>Approvals</Link>
          <Link href="/admin/bookings" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/admin/bookings')}>Bookings</Link>
          <Link href="/admin/analytics" onClick={() => setMenuOpen(false)} className={mobileRow(pathname === '/admin/analytics')}>Analytics</Link>

          <MobileMoreSection
            items={ADMIN_MORE_ITEMS}
            isOpen={adminMenuOpen}
            onToggle={() => setAdminMenuOpen(o => !o)}
            triggerActive={ADMIN_TRIGGER_PREFIXES.some(p => pathname.startsWith(p))}
            pathname={pathname}
            onItemClick={() => { setAdminMenuOpen(false); setMenuOpen(false); }}
          />
        </>
      )}
    </>
  );

  /* ── Desktop overflow: collapse into "More" instead of hiding ──────────
     The four generic links plus the current role's own 2-4 direct links are
     "collapsible" — measured against the real available width (via a
     hidden clone below) and, starting from the tail of the list, moved into
     that same role's existing More dropdown whenever they don't fit. Items
     only ever leave from the end, never the start, so the first item is
     never the one that disappears, and nothing is silently hidden — it's
     always still reachable through More. The Investor overlay is left out
     of this calculation (see its own comment further down). */
  type PrimaryNavItem = { key: string; href: string; label: string; active: boolean };

  const primaryItems: PrimaryNavItem[] = [
    { key: 'discover',    href: '/',           label: 'Home',          active: pathname === '/' },
    { key: 'stays',       href: '/stays',       label: 'Explore Stays', active: pathname === '/stays' },
    { key: 'experiences', href: '/experiences', label: 'Experiences',   active: pathname.startsWith('/experiences') },
    { key: 'about',       href: '/about',       label: 'About Us',      active: pathname === '/about' },
  ];

  let roleFixedItems: MoreMenuItem[] = [];
  let roleTriggerPrefixes: string[] = [];
  let roleMoreOpen = anonMoreOpen;
  let setRoleMoreOpen = setAnonMoreOpen;

  if (user?.role === 'HOST') {
    primaryItems.push(
      { key: 'host-dashboard', href: '/dashboard',      label: 'Dashboard', active: pathname === '/dashboard' },
      { key: 'host-bookings',  href: '/host/bookings',  label: 'Bookings',  active: pathname === '/host/bookings' },
      { key: 'host-analytics', href: '/host/analytics', label: 'Analytics', active: pathname === '/host/analytics' },
    );
    roleFixedItems = HOST_MORE_ITEMS;
    roleTriggerPrefixes = HOST_TRIGGER_PREFIXES;
    roleMoreOpen = hostMenuOpen;
    setRoleMoreOpen = setHostMenuOpen;
  } else if (user?.role === 'GUEST') {
    primaryItems.push({ key: 'guest-bookings', href: '/dashboard', label: 'My Bookings', active: pathname === '/dashboard' });
    if (isEnabled('sos')) {
      primaryItems.push({ key: 'guest-sos', href: '/sos', label: '🆘 SOS', active: false });
    }
    primaryItems.push({ key: 'guest-wishlist', href: '/guest/wishlist', label: 'Wishlist', active: pathname === '/guest/wishlist' });
    if (isEnabled('stay_pass')) {
      primaryItems.push({ key: 'guest-passport', href: '/passport', label: 'Passport', active: pathname === '/passport' });
    }
    if (isEnabled('guest_host_messaging')) {
      primaryItems.push({ key: 'guest-messages', href: '/guest/messages', label: 'Messages', active: pathname.startsWith('/guest/messages') });
    }
    if (isEnabled('membership')) {
      primaryItems.push({ key: 'guest-membership', href: '/guest/membership', label: 'Membership', active: pathname.startsWith('/guest/membership') });
    }
    roleFixedItems = GUEST_MORE_ITEMS.filter(item => !item.feature || isEnabled(item.feature));
    roleTriggerPrefixes = GUEST_TRIGGER_PREFIXES;
    roleMoreOpen = guestMenuOpen;
    setRoleMoreOpen = setGuestMenuOpen;
  } else if (user?.role === 'ADMIN') {
    primaryItems.push(
      { key: 'admin-dashboard', href: '/admin',          label: 'Dashboard', active: pathname === '/admin' },
      { key: 'admin-approvals', href: '/admin/listings',  label: 'Approvals', active: pathname === '/admin/listings' },
      { key: 'admin-bookings',  href: '/admin/bookings',  label: 'Bookings',  active: pathname === '/admin/bookings' },
      { key: 'admin-analytics', href: '/admin/analytics', label: 'Analytics', active: pathname === '/admin/analytics' },
    );
    roleFixedItems = ADMIN_MORE_ITEMS;
    roleTriggerPrefixes = ADMIN_TRIGGER_PREFIXES;
    roleMoreOpen = adminMenuOpen;
    setRoleMoreOpen = setAdminMenuOpen;
  }

  const visibleItems = primaryItems.slice(0, visibleCount ?? primaryItems.length);
  const demotedItems = primaryItems.slice(visibleCount ?? primaryItems.length);
  const desktopMoreItems: MoreMenuItem[] = [
    ...demotedItems.map(item => ({ href: item.href, label: item.label })),
    ...roleFixedItems,
  ];
  const desktopMoreTriggerActive =
    roleTriggerPrefixes.some(p => pathname.startsWith(p)) || demotedItems.some(item => item.active);

  const itemsKey = primaryItems.map(item => item.key).join('|') + (roleFixedItems.length > 0 ? '+more' : '');

  const recomputeVisibleCount = () => {
    const container = containerRef.current;
    const moreEl = moreMeasureRef.current;
    if (!container || !moreEl) return;
    const gap = 24; // gap-6
    const containerWidth = container.clientWidth;
    const moreWidth = moreEl.offsetWidth;
    const widths = itemRefs.current.slice(0, primaryItems.length).map(el => el?.offsetWidth ?? 0);
    const mustReserveMore = roleFixedItems.length > 0;
    const totalAll = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1);

    if (!mustReserveMore && totalAll <= containerWidth) {
      setVisibleCount(widths.length);
      return;
    }

    const budget = containerWidth - moreWidth - gap;
    let used = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const next = used + (i > 0 ? gap : 0) + widths[i];
      if (next > budget) break;
      used = next;
      count++;
    }
    setVisibleCount(count);
  };

  const recomputeRef = useRef(recomputeVisibleCount);
  recomputeRef.current = recomputeVisibleCount;

  useLayoutEffect(() => {
    recomputeRef.current();
  }, [itemsKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => recomputeRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="container-page">
        <nav className="flex items-center justify-between gap-6 h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo />
            <span
              className="font-bold text-brand-700 text-lg tracking-tight group-hover:opacity-80 transition-opacity"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Dhyana Stays
            </span>
          </Link>

          {/* Desktop nav — shown from lg: up (1024px) rather than md: (768px):
              logged-in role-specific links roughly double the item count, and
              768px was never wide enough to hold that plus the right-side
              actions cleanly. `flex-1 min-w-0` makes this container's real
              width exactly the leftover space between the logo and the
              right-side actions, regardless of how many links are inside it —
              that width, measured live via ResizeObserver, is what decides
              how many links fit vs. get collapsed into "More" below. */}
          <div ref={containerRef} className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-6 overflow-hidden">
            {visibleItems.map(item => (
              <Link
                key={item.key}
                href={item.href}
                className={`text-sm transition-colors whitespace-nowrap ${
                  item.active ? 'text-brand-700 font-semibold' : 'text-gray-500 hover:text-brand-700'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {desktopMoreItems.length > 0 && (
              <MoreMenu
                items={desktopMoreItems}
                isOpen={roleMoreOpen}
                onToggle={() => setRoleMoreOpen(o => !o)}
                onClose={() => setRoleMoreOpen(false)}
                triggerActive={desktopMoreTriggerActive}
                pathname={pathname}
                onItemClick={() => setRoleMoreOpen(false)}
              />
            )}

            {/* Investor overlay — kept outside the collapsible calculation above:
                it renders "alongside" a host/guest role rather than replacing
                it (see the condition below), so it isn't part of the generic
                responsive-priority sequence. Unchanged from before. */}
            {user?.kind === 'INVESTOR' && user.role !== 'ADMIN' && (
              <>
                <Link href="/investor/portfolio" className={`text-sm transition-colors whitespace-nowrap ${isActive('/investor/portfolio')}`}>
                  Portfolio
                </Link>
                <Link href="/investor/distributions" className={`text-sm transition-colors whitespace-nowrap ${isActivePrefix('/investor/distributions')}`}>
                  Distributions
                </Link>
                <MoreMenu
                  items={INVESTOR_MORE_ITEMS}
                  isOpen={investorMenuOpen}
                  onToggle={() => setInvestorMenuOpen(o => !o)}
                  onClose={() => setInvestorMenuOpen(false)}
                  triggerActive={INVESTOR_TRIGGER_PREFIXES.some(p => pathname.startsWith(p))}
                  pathname={pathname}
                  onItemClick={() => setInvestorMenuOpen(false)}
                />
              </>
            )}
          </div>

          {/* Hidden measurement clone: same labels as the live row above (and
              always bold, i.e. each label's widest possible rendering) laid
              out off-screen so recomputeVisibleCount() can read real pixel
              widths — including for items that aren't currently visible —
              without affecting document layout (`position: absolute` +
              `visibility: hidden`, so it never adds scroll/paint). */}
          <div
            aria-hidden="true"
            style={{ position: 'absolute', top: 0, left: 0, visibility: 'hidden', pointerEvents: 'none' }}
            className="hidden lg:flex items-center gap-6"
          >
            {primaryItems.map((item, i) => (
              <span
                key={item.key}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="text-sm font-semibold whitespace-nowrap"
              >
                {item.label}
              </span>
            ))}
            <span ref={moreMeasureRef} className="text-sm font-semibold flex items-center gap-1 whitespace-nowrap">
              More
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
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
                <div className="hidden sm:block relative group">
                  {/* btn-ghost centers its content (`justify-center`, for its
                      normal icon+label buttons) — with a bare overflowing text
                      node that centers the OVERFLOW too, clipping equally from
                      both ends instead of producing a trailing ellipsis. The
                      fix is to give the text its own inline-block box (with
                      its own max-width + truncate) nested inside btn-ghost, so
                      it's a single flex item btn-ghost just hugs, rather than
                      letting a raw text node overflow the flex container
                      directly. */}
                  <Link href="/dashboard" className="btn-ghost text-sm">
                    <span className="inline-block max-w-[160px] truncate align-bottom">{user.email}</span>
                  </Link>
                  {/* Lightweight hover tooltip — no component/library exists in
                      the app for this, so it's plain CSS (group-hover/focus-within),
                      styled to match the same opaque bg-white card treatment as
                      the More dropdown for visual consistency and theme-safety. */}
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute right-0 top-full mt-2 z-50 max-w-[min(85vw,280px)] whitespace-normal break-words rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100"
                  >
                    {user.email}
                  </div>
                </div>
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
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
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

      {/* Mobile navigation drawer — a full-height sheet rather than a panel
          that pushes page content down. Portaled to document.body: `.glass-nav`
          on <header> sets a `backdrop-filter`, and per the CSS Filter Effects
          spec a `backdrop-filter` (like `transform`) makes its element the
          containing block for `position: fixed` descendants — a plain fixed
          div nested under this header would be confined to the header's own
          64px-tall box instead of the viewport. Portaling escapes that the
          same way the Explore Stays filter drawer already has to. */}
      {menuOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="lg:hidden fixed inset-0 z-[55] bg-black/40 animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="lg:hidden fixed inset-y-0 right-0 z-[60] w-full sm:w-[400px] bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200">
              <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 group">
                <Logo />
                <span
                  className="font-bold text-brand-700 text-lg tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Dhyana Stays
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable navigation — the only part that scrolls; header and
                the user/actions footer below stay fixed in place. */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-4 sm:px-6 py-4">
              <div className="flex flex-col gap-0.5">
                {navLinks}
              </div>
            </div>

            {/* Fixed user / actions footer */}
            <div className="shrink-0 border-t border-gray-200 px-4 sm:px-6 py-4">
              {(user?.role === 'GUEST' || user?.role === 'HOST' || user?.role === 'ADMIN') && (
                <div className="sm:hidden flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
                  {user.role === 'GUEST' && <GuestNotificationBell />}
                  {user.role === 'HOST' && <HostNotificationBell />}
                  {user.role === 'ADMIN' && (
                    <>
                      <AdminSearchOverlay />
                      <AdminNotificationBell />
                    </>
                  )}
                </div>
              )}

              {isLoading ? null : user ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-400 truncate px-1">{user.email}</p>
                  <button onClick={handleLogout} className="btn-secondary text-sm w-full py-3">Sign out</button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="btn-ghost text-sm w-full py-3">Sign in</Link>
                  <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm w-full py-3">Get started</Link>
                </div>
              )}
            </div>
          </aside>
        </>,
        document.body,
      )}
    </header>
  );
}
