"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_KEYS = exports.FEATURE_REGISTRY = void 0;
exports.getFeatureDefinition = getFeatureDefinition;
exports.FEATURE_REGISTRY = [
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
        defaultEnabled: false,
        audience: ['guest', 'host'],
    },
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
    {
        key: 'sos',
        label: 'Emergency SOS',
        description: 'Guest panic button that alerts ops + trusted contacts. Disabling stops emergency dispatch.',
        category: 'Safety',
        defaultEnabled: true,
        audience: ['guest'],
        critical: true,
    },
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
    {
        key: 'guest_host_messaging',
        label: 'Guest ↔ Host Messaging',
        description: 'Direct messaging between guests and hosts.',
        category: 'Messaging',
        defaultEnabled: true,
        audience: ['guest', 'host'],
    },
    {
        key: 'investor_dashboard',
        label: 'Investor Dashboard',
        description: 'Investor portfolio, distributions, capital calls and documents.',
        category: 'Investor',
        defaultEnabled: true,
        audience: ['investor'],
    },
];
exports.FEATURE_KEYS = exports.FEATURE_REGISTRY.map((f) => f.key);
function getFeatureDefinition(key) {
    return exports.FEATURE_REGISTRY.find((f) => f.key === key);
}
//# sourceMappingURL=feature-flags.registry.js.map