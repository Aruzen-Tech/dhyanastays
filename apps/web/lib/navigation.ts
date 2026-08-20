import type { UserKind, UserRole } from './types';

export type ActiveMatch = 'exact' | 'prefix';

export interface NavItem {
  /** Stable, human-legible key — used for React lists and width measurement. */
  id: string;
  href: string;
  label: string;
  activeMatch: ActiveMatch;
  /** Escape hatch for the Guest SOS link — no other item needs this. */
  emphasis?: 'danger';
  /** Native title attribute (SOS tooltip). */
  title?: string;
}

interface ConditionalNavItem extends NavItem {
  /** Feature-flag key gating this item; omit if always shown. */
  feature?: string;
}

export interface BuildNavItemsInput {
  role: UserRole | undefined;
  kind: UserKind | undefined;
  isEnabled: (key: string) => boolean;
}

/** Must match the gap the live row and the measurement clone both render with. */
export const NAV_GAP_PX = 24;

/**
 * The single source of truth for "what navigation is available to this
 * user" — translated 1:1 from the original per-role JSX blocks, in one
 * flat, priority-ordered list per state (primary items first, former
 * "More"-bucket items appended after, in their original relative order).
 * Both the measured desktop row and the flat mobile drawer consume this
 * same array, so they cannot structurally drift apart.
 */
export function buildNavItems({ role, kind, isEnabled }: BuildNavItemsInput): NavItem[] {
  const items: NavItem[] = [
    { id: 'explore', href: '/', label: 'Explore', activeMatch: 'exact' },
    { id: 'experiences', href: '/experiences', label: 'Experiences', activeMatch: 'prefix' },
  ];

  if (role === 'HOST') {
    items.push(
      { id: 'host-dashboard', href: '/dashboard', label: 'Dashboard', activeMatch: 'exact' },
      { id: 'host-bookings', href: '/host/bookings', label: 'Bookings', activeMatch: 'exact' },
      { id: 'host-analytics', href: '/host/analytics', label: 'Analytics', activeMatch: 'exact' },
      { id: 'host-control-panel', href: '/host/control-panel', label: '🎛 Control Panel', activeMatch: 'exact' },
      { id: 'host-new-listing', href: '/host/listings/new', label: '+ New Listing', activeMatch: 'exact' },
      { id: 'host-experiences', href: '/host/experiences', label: 'Experiences', activeMatch: 'exact' },
      { id: 'host-messages', href: '/host/messages', label: 'Messages', activeMatch: 'exact' },
      { id: 'host-quick-replies', href: '/host/quick-replies', label: 'Quick Replies', activeMatch: 'exact' },
      { id: 'host-issues', href: '/host/issues', label: 'Guest Issues', activeMatch: 'exact' },
      { id: 'host-payouts', href: '/host/payouts', label: 'Payouts', activeMatch: 'exact' },
      { id: 'host-calendar', href: '/host/calendar', label: 'Calendar', activeMatch: 'exact' },
      { id: 'host-performance', href: '/host/performance', label: 'Performance', activeMatch: 'exact' },
      { id: 'host-forecast', href: '/host/forecast', label: 'Forecast', activeMatch: 'exact' },
    );
  }

  if (role === 'GUEST') {
    items.push({ id: 'guest-bookings', href: '/dashboard', label: 'My Bookings', activeMatch: 'exact' });
    // SOS is surfaced as an always-reachable floating button (SosFab), not a nav item.
    items.push({ id: 'guest-wishlist', href: '/guest/wishlist', label: 'Wishlist', activeMatch: 'exact' });
    if (isEnabled('stay_pass')) {
      items.push({ id: 'guest-passport', href: '/passport', label: 'Passport', activeMatch: 'exact' });
    }
    if (isEnabled('guest_host_messaging')) {
      items.push({ id: 'guest-messages', href: '/guest/messages', label: 'Messages', activeMatch: 'prefix' });
    }
    if (isEnabled('membership')) {
      items.push({ id: 'guest-membership', href: '/guest/membership', label: 'Membership', activeMatch: 'prefix' });
    }

    const guestMore: ConditionalNavItem[] = [
      { id: 'guest-experiences', href: '/guest/experiences', label: 'My Experiences', activeMatch: 'exact', feature: 'experiences' },
      { id: 'guest-trip-groups', href: '/trip-groups', label: 'Trip Groups', activeMatch: 'exact', feature: 'trip_groups' },
      { id: 'guest-itineraries', href: '/itineraries', label: 'AI Itineraries', activeMatch: 'exact', feature: 'ai_itinerary' },
      { id: 'guest-sos-history', href: '/guest/sos', label: 'SOS History', activeMatch: 'exact', feature: 'sos' },
      { id: 'guest-sip', href: '/guest/sip', label: 'Trip Savings SIP', activeMatch: 'exact', feature: 'membership' },
      { id: 'guest-loyalty', href: '/guest/loyalty', label: 'Loyalty', activeMatch: 'exact', feature: 'membership' },
      { id: 'guest-referrals', href: '/guest/referrals', label: 'Referrals', activeMatch: 'exact', feature: 'referrals' },
      { id: 'guest-preferences', href: '/guest/preferences', label: 'Preferences', activeMatch: 'exact' },
      { id: 'guest-notifications', href: '/guest/notifications', label: 'Notifications', activeMatch: 'exact' },
      { id: 'guest-trusted-contacts', href: '/guest/trusted-contacts', label: 'Trusted Contacts', activeMatch: 'exact', feature: 'sos' },
      { id: 'guest-profile', href: '/guest/profile', label: 'Profile', activeMatch: 'exact' },
    ];
    items.push(...guestMore.filter((item) => !item.feature || isEnabled(item.feature)));
  }

  if (kind === 'INVESTOR' && role !== 'ADMIN') {
    items.push(
      { id: 'investor-portfolio', href: '/investor/portfolio', label: 'Portfolio', activeMatch: 'exact' },
      { id: 'investor-distributions', href: '/investor/distributions', label: 'Distributions', activeMatch: 'prefix' },
      { id: 'investor-capital-calls', href: '/investor/capital-calls', label: 'Capital Calls', activeMatch: 'exact' },
      { id: 'investor-documents', href: '/investor/documents', label: 'Documents', activeMatch: 'exact' },
    );
  }

  if (role === 'ADMIN') {
    items.push(
      { id: 'admin-dashboard', href: '/admin', label: 'Dashboard', activeMatch: 'exact' },
      { id: 'admin-approvals', href: '/admin/listings', label: 'Approvals', activeMatch: 'exact' },
      { id: 'admin-spotlight', href: '/admin/spotlight', label: '✨ Stay Spotlight', activeMatch: 'exact' },
      ...(isEnabled('advertisements')
        ? [{ id: 'admin-ads', href: '/admin/advertisements', label: '📣 Advertisement Centre', activeMatch: 'prefix' } as NavItem]
        : []),
      { id: 'admin-bookings', href: '/admin/bookings', label: 'Bookings', activeMatch: 'exact' },
      { id: 'admin-analytics', href: '/admin/analytics', label: 'Analytics', activeMatch: 'exact' },
      { id: 'admin-control-panel', href: '/admin/control-panel', label: '🎛 Control Panel', activeMatch: 'exact' },
      ...(isEnabled('crm')
        ? [{ id: 'admin-crm', href: '/admin/crm', label: '🧩 CRM', activeMatch: 'prefix' } as NavItem]
        : []),
      { id: 'admin-sos', href: '/admin/sos', label: '🆘 SOS Console', activeMatch: 'exact' },
      { id: 'admin-concierge', href: '/admin/concierge', label: 'Concierge Chats', activeMatch: 'exact' },
      { id: 'admin-exp-mod', href: '/admin/experiences', label: 'Experience Moderation', activeMatch: 'exact' },
      { id: 'admin-investors', href: '/admin/investor/investments', label: 'Investors', activeMatch: 'exact' },
      { id: 'admin-staff', href: '/admin/staff', label: 'Staff', activeMatch: 'exact' },
      { id: 'admin-staff-apps', href: '/admin/staff/applications', label: 'Staff Applications', activeMatch: 'exact' },
      { id: 'admin-messages', href: '/admin/messages', label: 'Messages', activeMatch: 'exact' },
      { id: 'admin-issues', href: '/admin/issues', label: 'Guest Issues', activeMatch: 'exact' },
      { id: 'admin-addons', href: '/admin/addons', label: 'Add-ons', activeMatch: 'exact' },
      { id: 'admin-providers', href: '/admin/service-providers', label: 'Service Providers', activeMatch: 'exact' },
      { id: 'admin-payouts', href: '/admin/payouts', label: 'Payouts', activeMatch: 'exact' },
      { id: 'admin-users', href: '/admin/users', label: 'Users', activeMatch: 'exact' },
      { id: 'admin-refunds', href: '/admin/refunds', label: 'Refunds', activeMatch: 'exact' },
      { id: 'admin-calendar', href: '/admin/calendar', label: 'Calendar', activeMatch: 'exact' },
      { id: 'admin-host-perf', href: '/admin/hosts/performance', label: 'Host Performance', activeMatch: 'exact' },
      { id: 'admin-activity', href: '/admin/activity', label: 'Admin Activity', activeMatch: 'exact' },
      { id: 'admin-forecast', href: '/admin/forecast', label: 'Revenue Forecast', activeMatch: 'exact' },
      { id: 'admin-rate-limits', href: '/admin/rate-limits', label: 'Rate Limits', activeMatch: 'exact' },
      { id: 'admin-settings', href: '/admin/settings', label: 'Settings', activeMatch: 'exact' },
      { id: 'admin-audit', href: '/admin/audit', label: 'Audit Log', activeMatch: 'exact' },
    );
  }

  return items;
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  return item.activeMatch === 'exact' ? pathname === item.href : pathname.startsWith(item.href);
}

/** Drives the "More" trigger's active state when any item inside it matches the route. */
export function isOverflowActive(overflowItems: NavItem[], pathname: string): boolean {
  return overflowItems.some((item) => isItemActive(item, pathname));
}
