/**
 * Keyword + description hints for navigable features, keyed by route. Powers
 * the assistant's instant search (fuzzy match over label + keywords) and
 * enriches the catalog sent to the AI (label + description). The route list a
 * user can actually reach still comes from `buildNavItems` (role-aware) — this
 * only adds synonyms/descriptions on top, so nothing here grants access.
 */
export interface FeatureHint {
  keywords: string[];
  description: string;
}

export const FEATURE_HINTS: Record<string, FeatureHint> = {
  '/': { keywords: ['explore', 'search', 'stays', 'discover', 'listings', 'retreats', 'book'], description: 'Browse and search wellness retreats' },
  '/experiences': { keywords: ['experiences', 'yoga', 'wellness', 'sessions', 'activities'], description: 'Host-led wellness experiences to book' },
  '/dashboard': { keywords: ['dashboard', 'overview', 'my bookings', 'home'], description: 'Your dashboard and bookings overview' },

  // Guest
  '/guest/wishlist': { keywords: ['wishlist', 'saved', 'favourites', 'favorites'], description: 'Saved / favourited stays' },
  '/passport': { keywords: ['passport', 'stay pass', 'ticket', 'qr', 'check-in'], description: 'Stay Pass tickets and QR check-in' },
  '/guest/messages': { keywords: ['messages', 'chat', 'host', 'inbox'], description: 'Messages with hosts' },
  '/guest/membership': { keywords: ['membership', 'tier', 'benefits'], description: 'Membership tiers and benefits' },
  '/itineraries': { keywords: ['itinerary', 'ai', 'trip plan', 'planner'], description: 'AI-generated trip itineraries' },
  '/trip-groups': { keywords: ['trip groups', 'split', 'expenses', 'group'], description: 'Group trips and expense splitting' },
  '/guest/sos': { keywords: ['sos history', 'emergency history', 'incidents'], description: 'Your past SOS incidents' },
  '/guest/sip': { keywords: ['sip', 'savings', 'trip savings'], description: 'Trip savings plan (SIP)' },
  '/guest/loyalty': { keywords: ['loyalty', 'points', 'rewards'], description: 'Loyalty points and rewards' },
  '/guest/referrals': { keywords: ['referrals', 'invite', 'refer', 'credit'], description: 'Refer friends for credit' },
  '/guest/preferences': { keywords: ['preferences', 'settings', 'dietary'], description: 'Your travel preferences' },
  '/guest/notifications': { keywords: ['notifications', 'alerts'], description: 'Your notifications' },
  '/guest/trusted-contacts': { keywords: ['trusted contacts', 'emergency contacts'], description: 'Emergency trusted contacts' },
  '/guest/profile': { keywords: ['profile', 'account', 'details'], description: 'Your profile' },
  '/sos': { keywords: ['sos', 'emergency', 'panic', 'help', 'urgent'], description: 'Trigger an emergency SOS' },

  // Host
  '/host/bookings': { keywords: ['bookings', 'reservations', 'guests'], description: 'Bookings for your listings' },
  '/host/analytics': { keywords: ['analytics', 'stats', 'performance', 'revenue'], description: 'Listing analytics' },
  '/host/control-panel': { keywords: ['control panel', 'settings', 'features'], description: 'Host settings and feature toggles' },
  '/host/listings/new': { keywords: ['new listing', 'add property', 'create listing', 'add listing', 'list property'], description: 'Add a new property listing' },
  '/host/experiences': { keywords: ['experiences', 'sessions'], description: 'Your hosted experiences' },
  '/host/messages': { keywords: ['messages', 'chat', 'guests'], description: 'Messages with guests' },
  '/host/quick-replies': { keywords: ['quick replies', 'templates', 'canned'], description: 'Saved quick-reply templates' },
  '/host/issues': { keywords: ['issues', 'problems', 'guest issues'], description: 'Guest-reported issues' },
  '/host/payouts': { keywords: ['payouts', 'earnings', 'money', 'payment'], description: 'Your payouts and earnings' },
  '/host/calendar': { keywords: ['calendar', 'availability', 'block dates'], description: 'Availability calendar' },
  '/host/performance': { keywords: ['performance', 'ranking', 'score'], description: 'Host performance' },
  '/host/forecast': { keywords: ['forecast', 'projection', 'revenue'], description: 'Revenue forecast' },

  // Admin
  '/admin': { keywords: ['admin', 'dashboard', 'overview'], description: 'Admin dashboard' },
  '/admin/listings': { keywords: ['approvals', 'listing approval', 'review listings', 'pending'], description: 'Approve or reject listings' },
  '/admin/bookings': { keywords: ['bookings', 'reservations', 'all bookings'], description: 'All bookings' },
  '/admin/analytics': { keywords: ['analytics', 'metrics', 'stats'], description: 'Platform analytics' },
  '/admin/control-panel': { keywords: ['control panel', 'feature flags', 'settings', 'toggles'], description: 'Platform control panel and feature flags' },
  '/admin/crm': { keywords: ['crm', 'contacts', 'customers', 'tags', 'notes', 'segments'], description: 'Customer relationship management' },
  '/admin/sos': { keywords: ['sos', 'emergency', 'panic', 'incidents'], description: 'SOS emergency console' },
  '/admin/concierge': { keywords: ['concierge', 'chats', 'support'], description: 'Concierge chats' },
  '/admin/experiences': { keywords: ['experience moderation', 'approve experiences'], description: 'Moderate experiences' },
  '/admin/investor/investments': { keywords: ['investors', 'investments', 'capital'], description: 'Investor management' },
  '/admin/staff': { keywords: ['staff', 'team', 'admins', 'roles'], description: 'Staff management' },
  '/admin/staff/applications': { keywords: ['staff applications', 'applicants'], description: 'Staff applications' },
  '/admin/messages': { keywords: ['messages', 'chat'], description: 'Admin messages' },
  '/admin/issues': { keywords: ['issues', 'guest issues', 'problems'], description: 'Guest issues' },
  '/admin/addons': { keywords: ['add-ons', 'addons', 'extras', 'services'], description: 'Booking add-ons' },
  '/admin/service-providers': { keywords: ['service providers', 'vendors', 'providers'], description: 'Service providers' },
  '/admin/payouts': { keywords: ['payouts', 'host payouts', 'payments', 'money'], description: 'Host payouts' },
  '/admin/users': { keywords: ['users', 'accounts', 'members', 'people'], description: 'Manage users' },
  '/admin/refunds': { keywords: ['refunds', 'refund', 'money back', 'cancel'], description: 'Process refunds' },
  '/admin/calendar': { keywords: ['calendar', 'bookings timeline'], description: 'Bookings calendar / timeline' },
  '/admin/hosts/performance': { keywords: ['host performance', 'host ranking'], description: 'Host performance' },
  '/admin/activity': { keywords: ['activity', 'admin activity'], description: 'Admin activity feed' },
  '/admin/forecast': { keywords: ['forecast', 'revenue projection'], description: 'Revenue forecast' },
  '/admin/rate-limits': { keywords: ['rate limits', 'throttle', 'security'], description: 'Rate limits' },
  '/admin/settings': { keywords: ['settings', 'platform settings'], description: 'Platform settings' },
  '/admin/audit': { keywords: ['audit log', 'audit', 'history'], description: 'Audit log' },

  // Investor
  '/investor/portfolio': { keywords: ['portfolio', 'investments', 'holdings'], description: 'Investment portfolio' },
  '/investor/distributions': { keywords: ['distributions', 'payouts', 'returns'], description: 'Distributions' },
  '/investor/capital-calls': { keywords: ['capital calls', 'funding'], description: 'Capital calls' },
  '/investor/documents': { keywords: ['documents', 'reports', 'statements'], description: 'Investor documents' },
};

export interface NavLike {
  id: string;
  href: string;
  label: string;
}

/** Rank a role's nav items against a query (label + keyword/description hints). */
export function searchNav<T extends NavLike>(query: string, items: T[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  return items
    .map((it) => {
      const hint = FEATURE_HINTS[it.href];
      const hay = `${it.label} ${hint?.keywords.join(' ') ?? ''} ${hint?.description ?? ''}`.toLowerCase();
      let score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
      if (it.label.toLowerCase().includes(q)) score += 2;
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}

/** Build the {label, href, description} catalog sent to the AI. */
export function toCatalog<T extends NavLike>(items: T[]): { label: string; href: string; description?: string }[] {
  return items.map((it) => ({
    label: it.label,
    href: it.href,
    description: FEATURE_HINTS[it.href]?.description,
  }));
}
