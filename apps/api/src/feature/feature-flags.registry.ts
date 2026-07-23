/**
 * Canonical platform feature registry.
 *
 * Flags are DEFINED here in code (not the DB). The DB only stores admin
 * OVERRIDES of these defaults — a missing override row means "use defaultEnabled".
 * This keeps the source of truth versioned and prevents orphan/typo'd keys.
 *
 * Adding a feature: add an entry here, then apply @FeatureGate(key) to its
 * controller(s). The admin control panel renders this registry automatically.
 */

export type FeatureCategory =
  | 'Bookings & Payments'
  | 'Guest Experience'
  | 'AI & Concierge'
  | 'Safety'
  | 'Loyalty & Growth'
  | 'Messaging'
  | 'Investor';

export type FeatureAudience = 'guest' | 'host' | 'admin' | 'investor';

export interface FeatureDefinition {
  /** Stable key used by @FeatureGate and the UI. snake_case. */
  key: string;
  label: string;
  description: string;
  category: FeatureCategory;
  /** Value used when no admin override exists. */
  defaultEnabled: boolean;
  /** Roles that see this feature's availability (drives host panel + UI gating). */
  audience: FeatureAudience[];
  /**
   * Safety classification. CORE features can be toggled but warn the admin
   * (they affect revenue or safety). Toggling SOS off, for example, should be
   * deliberate.
   */
  critical?: boolean;
}

export const FEATURE_REGISTRY: readonly FeatureDefinition[] = [
  // ── Bookings & Payments ───────────────────────────────────────────────────
  {
    key: 'pay_later',
    label: 'Pay Later',
    description: 'Let guests split a booking into monthly instalments (3/6/12 months).',
    category: 'Bookings & Payments',
    defaultEnabled: true,
    audience: ['guest'],
  },
  {
    key: 'add_ons',
    label: 'Booking Add-ons',
    description: 'Optional services (spa, transport, meals) attached to a booking at checkout.',
    category: 'Bookings & Payments',
    defaultEnabled: false, // Phase 1: off until provider payouts ship
    audience: ['guest', 'host'],
  },
  {
    key: 'stay_pass',
    label: 'Stay Pass',
    description:
      'Themed booking tickets (email/PDF/share image) with signed-QR check-in verification.',
    category: 'Guest Experience',
    defaultEnabled: false, // rollout-gated: enable per environment when storage is provisioned
    audience: ['guest', 'host', 'admin'],
  },

  // ── Guest Experience ──────────────────────────────────────────────────────
  {
    key: 'experiences',
    label: 'Wellness Experiences',
    description: 'Host-led yoga, meditation and wellness sessions guests can book.',
    category: 'Guest Experience',
    defaultEnabled: true,
    audience: ['guest', 'host'],
  },
  {
    key: 'trip_groups',
    label: 'Trip Groups & Expense Splitting',
    description: 'Plan retreats together and split expenses among group members.',
    category: 'Guest Experience',
    defaultEnabled: true,
    audience: ['guest'],
  },

  // ── AI & Concierge ────────────────────────────────────────────────────────
  {
    key: 'ai_itinerary',
    label: 'AI Itinerary Planner',
    description: 'AI-generated day-by-day retreat plans with chat refinement.',
    category: 'AI & Concierge',
    defaultEnabled: true,
    audience: ['guest'],
  },
  {
    key: 'concierge_chat',
    label: 'Concierge Chat',
    description: 'Per-booking concierge thread between guest, host and ops.',
    category: 'AI & Concierge',
    defaultEnabled: true,
    audience: ['guest', 'host'],
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  {
    key: 'sos',
    label: 'Emergency SOS',
    description: 'Guest panic button that alerts ops + trusted contacts. Disabling stops emergency dispatch.',
    category: 'Safety',
    defaultEnabled: true,
    audience: ['guest'],
    critical: true,
  },

  // ── Loyalty & Growth ──────────────────────────────────────────────────────
  {
    key: 'membership',
    label: 'Membership & Trip SIP',
    description: 'Membership tiers and systematic trip-savings plans.',
    category: 'Loyalty & Growth',
    defaultEnabled: true,
    audience: ['guest'],
  },
  {
    key: 'referrals',
    label: 'Referral Program',
    description: 'Guest referral codes and credit ledger.',
    category: 'Loyalty & Growth',
    defaultEnabled: true,
    audience: ['guest'],
  },

  // ── Messaging ─────────────────────────────────────────────────────────────
  {
    key: 'guest_host_messaging',
    label: 'Guest ↔ Host Messaging',
    description: 'Direct messaging between guests and hosts.',
    category: 'Messaging',
    defaultEnabled: true,
    audience: ['guest', 'host'],
  },

  // ── Investor ──────────────────────────────────────────────────────────────
  {
    key: 'investor_dashboard',
    label: 'Investor Dashboard',
    description: 'Investor portfolio, distributions, capital calls and documents.',
    category: 'Investor',
    defaultEnabled: true,
    audience: ['investor'],
  },
];

export const FEATURE_KEYS = FEATURE_REGISTRY.map((f) => f.key);

export function getFeatureDefinition(key: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY.find((f) => f.key === key);
}
