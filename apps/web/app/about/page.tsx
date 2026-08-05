'use client';

/**
 * About Us — company story page.
 *
 * UI modeled on the ReferenceUI design brief. This page is entirely static
 * content: no backend endpoint exists for company/CMS content anywhere in
 * this app (checked apps/api/src and the full Prisma schema — nothing
 * content-related), and none was added here. That matches how the reference
 * itself is built (hardcoded arrays, an import from a mock-data file that
 * doesn't exist in this repo, and a contact form that only calls
 * `preventDefault()` — no email is actually sent, even in the reference).
 *
 * Deliberate departures from the reference, agreed before writing this file:
 *   - Stats, team members, and contact details are clearly-placeholder
 *     content (real numbers/names/avatars/emails), swap them in later.
 *   - The reference's "Ecosystem" + "Services" sections describe business
 *     lines this app doesn't have (architecture consultancy, land
 *     development, food marketplace, bike rentals) and link to routes that
 *     don't exist (/business, /consultancy/*, /food, /bike-rental). Both
 *     sections are merged into one "What We Offer" grid built from this
 *     app's real, working features only — every link resolves, and each
 *     item is hidden if its platform feature flag is off.
 *   - "Partnership Models" is rewritten around the real Host/Investor
 *     relationship this app actually has (10% platform fee, Investment /
 *     Distribution records), not fictional land-lease/joint-development deals.
 *   - FAQ answers describing "how listing approval works" and "how investor
 *     access works" describe the real admin review workflow and the real
 *     admin-provisioned Investor kind — not invented processes.
 */

import Link from 'next/link';
import { useFeature } from '../../context/FeatureContext';
import AboutContactSection from '../../components/AboutContactSection';

// ─── Icons — inline SVG, matching the app's existing hand-authored convention
// (Navbar/Explore Stays icons use the same stroke="currentColor" style). ─────

type IconProps = { className?: string };

function IconEye({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>;
}
function IconCamera({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>;
}
function IconHome({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
}
function IconTrendingUp({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}
function IconBuilding({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>;
}
function IconUsers({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconLayers({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" /></svg>;
}
function IconFilter({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
}
function IconImageOff({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><line x1="2" y1="2" x2="22" y2="22" /><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" /><line x1="13.5" y1="13.5" x2="6" y2="21" /><path d="M18 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /><path d="M21 15V6a2 2 0 0 0-2-2H9" /></svg>;
}
function IconFileQuestion({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>;
}
function IconCheck({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;
}
function IconX({ className }: IconProps) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}
function IconMapPin({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>;
}
function IconCalendarClock({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4.5" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><circle cx="18" cy="18" r="4" /><path d="M18 16.5v1.5l1 1" /></svg>;
}
function IconBot({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>;
}
function IconCompass({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></svg>;
}
function IconSparkles({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" /></svg>;
}
function IconShieldCheck({ className }: IconProps) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>;
}
function IconShield({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>;
}
function IconHeart({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>;
}
function IconLeaf({ className }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>;
}
function IconStar({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.166-.755a2.12 2.12 0 0 0 1.597-1.16z" />
    </svg>
  );
}
function IconGlobe({ className }: IconProps) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;
}
function IconMegaphone({ className }: IconProps) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M3 11a1 1 0 0 1 1-1h2a8 8 0 0 0 5.3-2L15 4.6A1 1 0 0 1 17 5v14a1 1 0 0 1-2 .4L11.3 16A8 8 0 0 0 6 14H4a1 1 0 0 1-1-1z" /><path d="M17 9a4 4 0 0 1 0 6" /><path d="M6 14v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4" /></svg>;
}
function IconBarChart({ className }: IconProps) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>;
}
function IconQuote({ className }: IconProps) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" /><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" /></svg>;
}
function IconChevronDown({ className }: IconProps) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}
function IconArrowRight({ className }: IconProps) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;
}

// ─── Static content — clearly-placeholder marketing copy. Swap numbers, team
// members and contact details for the real ones before this page goes live. ─

const HERO_STATS = [
  { value: '212', label: 'Curated Properties' },
  { value: '28,400+', label: 'Happy Travellers' },
  { value: '45', label: 'Destinations' },
  { value: '4.82', label: 'Average Rating' },
];

const PROBLEMS = [
  { Icon: IconEye, title: 'Discovery is broken', text: 'Endless listings with inconsistent quality — ratings that rarely reflect the real experience.' },
  { Icon: IconCamera, title: 'Hidden gems stay hidden', text: 'Beautiful properties go unnoticed without professional photography and curation.' },
  { Icon: IconHome, title: 'Great stays, generic listings', text: 'Wonderful hosts and properties get reduced to the same handful of stock filters.' },
  { Icon: IconTrendingUp, title: 'Capital without trust', text: 'Investors have money but struggle to find transparent, professionally run projects.' },
  { Icon: IconBuilding, title: 'Fragmented tools', text: 'Hosts juggle separate tools for pricing, messaging, payouts and guest support.' },
  { Icon: IconUsers, title: 'Communities left out', text: 'Local guides and wellness practitioners get little visibility from big platforms.' },
];

const STORY_ONE_BEFORE = [
  { Icon: IconLayers, text: 'Ten tabs open — booking sites, maps, blogs, socials' },
  { Icon: IconFilter, text: "Confusing filters that don't match how you actually search" },
  { Icon: IconImageOff, text: "Fake or outdated photos that don't match the property" },
  { Icon: IconFileQuestion, text: 'No story, no context — just a generic listing' },
];
const STORY_ONE_AFTER = [
  'Search by destination, property name or wellness theme',
  'Real photography, amenities and host details',
  'A live availability calendar and transparent, all-in pricing',
  'Map, grid and filtered views of every curated stay',
];
const TRAVEL_PURPOSES = ['Yoga Retreat', 'Silent Retreat', 'Family Getaway', 'Solo Reset'];

const STORY_TWO_BEFORE = [
  { Icon: IconMapPin, text: 'Maps for routes, Instagram for ideas' },
  { Icon: IconFileQuestion, text: 'Blogs and forums for what to actually do there' },
  { Icon: IconCalendarClock, text: 'Hours spent stitching it all into a day-by-day plan' },
];
const STORY_TWO_AFTER = [
  'Describe the trip in one line — destination, dates, interests',
  'A day-by-day itinerary generated in seconds',
  'Refine it by chat — the plan adjusts as you talk',
  'Save it, revisit it, or hand it to your travel companions',
];
const PLANNER_INPUTS = ['Destination', 'Travel Dates', 'Travellers', 'Interests'];

const COMPARISON = {
  traditional: ['Multiple booking sites', 'Endless searching', 'Generic listings', 'Manual trip planning', 'Scattered information'],
  dhyana: ['Curated stays only', 'Purpose-based search', 'Real property stories', 'AI-generated itinerary', 'Everything in one place'],
};

const PHILOSOPHY = ['Architectural quality', 'Guest experience', 'Sustainability', 'Hospitality standards', 'Safety', 'Cleanliness', 'Authenticity', 'Verified amenities'];

/** What We Offer — real, working features only. `feature` gates the tile on the
 * matching platform feature flag; omitted = always shown (no flag exists for it). */
const OFFERINGS: { Icon: (p: IconProps) => React.JSX.Element; label: string; text: string; href: string; feature?: string }[] = [
  { Icon: IconHome, label: 'Curated Stays', text: 'Search, filter and book architect-inspected wellness retreats.', href: '/stays' },
  { Icon: IconCompass, label: 'Wellness Experiences', text: 'Host-led yoga, meditation and wellness sessions.', href: '/experiences', feature: 'experiences' },
  { Icon: IconBot, label: 'AI Trip Planner', text: 'A day-by-day plan generated from one line, refined by chat.', href: '/itineraries/new', feature: 'ai_itinerary' },
  { Icon: IconUsers, label: 'Trip Groups', text: 'Plan retreats together and split expenses with your group.', href: '/trip-groups', feature: 'trip_groups' },
  { Icon: IconSparkles, label: 'Stay Pass & Passport', text: 'Themed booking tickets and a collectible record of every stay.', href: '/passport', feature: 'stay_pass' },
  { Icon: IconStar, label: 'Membership & Trip SIP', text: 'Tiered rewards and a systematic trip-savings plan.', href: '/guest/membership', feature: 'membership' },
  { Icon: IconShield, label: 'Emergency SOS', text: 'One-tap alert to our ops team and your trusted contacts.', href: '/sos', feature: 'sos' },
  { Icon: IconTrendingUp, label: 'Investor Portfolio', text: 'Hold a share in specific properties, view monthly distributions.', href: '/investor/portfolio', feature: 'investor_dashboard' },
];

/** The real Host/Investor relationship — 10% platform fee, matching pricing.service.ts. */
const MODELS = [
  { name: 'Host Partnership', text: 'List your property with Dhyana Stays. We handle discovery, booking, payments and guest support — you keep the large majority of nightly revenue after a 10% platform fee.' },
  { name: 'Investor Partnership', text: 'Hold a share in specific properties and receive your portion of revenue as monthly distributions, visible in your investor portfolio at any time.' },
];

const VALUES = [
  { Icon: IconHeart, title: 'Authentic Experiences', text: 'Real places, real hosts, real stories — never copy-paste hospitality.' },
  { Icon: IconLeaf, title: 'Sustainable Development', text: 'We favour hosts who build with the land, not on it.' },
  { Icon: IconStar, title: 'Quality Before Quantity', text: 'A small, curated catalog beats an unchecked flood of listings.' },
  { Icon: IconSparkles, title: 'Innovation Through Technology', text: 'AI planning and live tracking working quietly in the background.' },
  { Icon: IconShield, title: 'Transparency', text: 'Clear pricing, clear cancellation terms, clear investor reporting.' },
  { Icon: IconUsers, title: 'Community Growth', text: 'Local guides and wellness practitioners earn alongside every stay.' },
];

const VISION = [
  { phase: 'Now', title: "Launch India's curated wellness-stay platform", text: 'Bookings, experiences, AI planning and Stay Pass — one platform, live.' },
  { phase: 'Next', title: 'Deepen coverage across South India', text: 'More curated properties across Tamil Nadu, Kerala, Karnataka and Goa.' },
  { phase: 'Future', title: 'National expansion', text: 'The same curation standard, in every major Indian wellness destination.' },
  { phase: 'Long-term', title: 'A trusted hospitality technology platform', text: 'Curated stays and AI-assisted trip planning, wherever our guests travel.' },
];

/** Placeholder team — swap for real names, roles and photos before launch. */
const TEAM = [
  { role: 'Founder & CEO', person: 'Team Member', avatar: 'https://i.pravatar.cc/150?img=12', note: 'Hospitality & product' },
  { role: 'Co-Founder', person: 'Team Member', avatar: 'https://i.pravatar.cc/150?img=47', note: 'Guest experience' },
  { role: 'Operations', person: 'Team Member', avatar: 'https://i.pravatar.cc/150?img=59', note: 'Host & partner success' },
  { role: 'Technology', person: 'Team Member', avatar: 'https://i.pravatar.cc/150?img=68', note: 'Platform & AI' },
];

const IMPACT = [
  { value: '212', label: 'Curated Properties' },
  { value: '28,400+', label: 'Happy Travellers' },
  { value: '45', label: 'Destinations' },
  { value: '140+', label: 'Hosting Partners' },
];

/** Placeholder guest quotes — written for this page, not imported from anywhere. */
const TESTIMONIALS = [
  { id: 't1', name: 'Guest', location: 'Bengaluru', stayName: 'A retreat near Coorg', rating: 5, comment: 'The quiet was the whole point, and they got it exactly right. Every detail matched what the listing promised.' },
  { id: 't2', name: 'Guest', location: 'Chennai', stayName: 'A stay near Auroville', rating: 5, comment: 'Booked for two nights, stayed for four. The AI planner\'s day plan was better than anything I\'d have put together myself.' },
  { id: 't3', name: 'Host', location: 'Munnar', stayName: 'Host on the platform', rating: 4, comment: 'Payouts land on schedule and the dashboard tells me exactly what I\'m owed and when. That transparency is rare.' },
];

const FAQS = [
  { q: 'What makes Dhyana Stays different?', a: "We're not an open listing marketplace — every property goes through an approval review before it's bookable, and we keep building on top of the booking layer: AI trip planning, Stay Pass, trip groups, and more." },
  { q: 'How are properties approved?', a: 'A host submits their listing with photos, pricing and amenities. It stays in review until an admin approves it, requests changes, or rejects it — only approved listings ever appear in search.' },
  { q: 'Can I list my property?', a: "Yes — register as a host, then create your listing from the host dashboard. It's reviewed before it goes live." },
  { q: 'How can I become an investor?', a: 'Investor access is provisioned directly by our team rather than self-service — reach out via the contact form below and we\'ll walk you through it.' },
  { q: 'What is the AI Trip Planner?', a: 'Describe your trip in one line and it generates a day-by-day plan you can refine by chat — available from any stay or from the planner directly.' },
  { q: 'Is my payment secure?', a: 'Payments are processed through Razorpay; we never store your card details, and every booking is protected by our published cancellation policy.' },
];

const FINAL_CTAS = [
  { label: 'Book a Stay', href: '/stays', primary: true },
  { label: 'Become a Host', href: '/auth/register', primary: false },
  { label: 'Contact Our Team', href: '#contact', primary: false },
];

function useOfferings() {
  const experiencesOn = useFeature('experiences');
  const aiItineraryOn = useFeature('ai_itinerary');
  const tripGroupsOn = useFeature('trip_groups');
  const stayPassOn = useFeature('stay_pass');
  const membershipOn = useFeature('membership');
  const sosOn = useFeature('sos');
  const investorOn = useFeature('investor_dashboard');

  const flags: Record<string, boolean> = {
    experiences: experiencesOn,
    ai_itinerary: aiItineraryOn,
    trip_groups: tripGroupsOn,
    stay_pass: stayPassOn,
    membership: membershipOn,
    sos: sosOn,
    investor_dashboard: investorOn,
  };

  return OFFERINGS.filter((o) => !o.feature || flags[o.feature]);
}

export default function AboutUsPage() {
  const offerings = useOfferings();

  return (
    <div className="bg-surface">
      {/* ================= HERO ================= */}
      <section className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white overflow-hidden">
        <div className="container-page relative py-20 md:py-28 text-center">
          <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">About Dhyana Stays</span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mt-4 max-w-4xl mx-auto" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            More Than a Booking Platform. We Curate Extraordinary Wellness Stays.
          </h1>
          <p className="text-white/80 mt-6 max-w-2xl mx-auto leading-relaxed">
            A curated wellness-retreat platform where architecture, sustainability, technology
            and authentic hospitality come together — memorable stays for travellers, and a fair,
            transparent partnership for the hosts and investors who make them possible.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a href="#story" className="px-7 py-3.5 text-sm font-semibold bg-white text-brand-700 rounded-full hover:bg-white/90 transition-colors">
              Explore Our Story
            </a>
            <Link href="/auth/register" className="px-7 py-3.5 text-sm font-semibold border border-white/40 text-white rounded-full hover:bg-white/10 transition-colors">
              Become a Host
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 max-w-3xl mx-auto">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-4">
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{s.value}</p>
                <p className="text-[11px] text-white/70 mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/50 mt-4">Illustrative figures — updated as the platform grows.</p>
        </div>
      </section>

      {/* ================= OUR STORY ================= */}
      <section id="story" className="py-16 md:py-24 scroll-mt-16">
        <div className="container-page grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Our Story</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Why We Started Dhyana Stays
            </h2>
            <div className="space-y-4 mt-6 text-gray-500 leading-relaxed text-sm md:text-base">
              <p>
                Travel has become commercialized. Most platforms focus on filling rooms and
                maximizing listings — making it hard for travellers to find truly restorative
                places, while thoughtfully-run properties stay invisible without proper curation.
              </p>
              <p>
                We saw that gap firsthand: quiet, beautiful stays that never found the right
                guests, and travellers who couldn&apos;t tell a genuinely restorative property from
                a generic listing until they arrived.
              </p>
              <p className="text-gray-900 font-medium">
                Dhyana Stays exists to close that gap — every stay is reviewed before it&apos;s
                bookable, every listing tells the truth about the property, and hosts get a
                platform built around their success, not just their room count.
              </p>
            </div>
          </div>
          <div className="relative h-[380px] hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=600&q=75" alt="" aria-hidden="true" className="absolute top-0 left-0 w-[62%] h-[58%] object-cover rounded-2xl -rotate-2 shadow-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&q=75" alt="" aria-hidden="true" className="absolute top-[30%] right-0 w-[52%] h-[52%] object-cover rounded-2xl rotate-3 shadow-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="https://images.unsplash.com/photo-1502786129293-79981df4e689?w=600&q=75" alt="" aria-hidden="true" className="absolute bottom-0 left-[12%] w-[48%] h-[42%] object-cover rounded-2xl -rotate-1 shadow-xl" />
          </div>
        </div>
      </section>

      {/* ================= THE PROBLEM ================= */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-page">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">The Problem</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Booking a Stay Shouldn&apos;t Be a Research Project
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="bg-surface card-hover rounded-2xl p-6">
                <span className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                  <p.Icon />
                </span>
                <h3 className="text-sm font-semibold text-gray-900">{p.title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16 mb-10">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">How We Solve It</span>
            <h3 className="text-xl md:text-3xl font-semibold text-gray-900 mt-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              From Confusing Search to Complete Confidence
            </h3>
          </div>

          {/* Story 1 — Finding the Perfect Stay */}
          <div>
            <div className="text-center mb-6">
              <span className="text-[11px] font-semibold text-brand-700 uppercase tracking-widest">Story 1 · Discovery</span>
              <h4 className="text-lg md:text-2xl font-semibold text-gray-900 mt-1.5">Finding the Perfect Stay</h4>
            </div>
            <div className="grid lg:grid-cols-2 gap-5 items-stretch">
              <div className="rounded-2xl border border-gray-200 bg-surface p-6 md:p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-red-50 text-red-500 text-[11px] font-semibold uppercase tracking-wider mb-5">
                  Without Dhyana Stays
                </span>
                <ul className="space-y-3 flex-1">
                  {STORY_ONE_BEFORE.map((p) => (
                    <li key={p.text} className="flex gap-3 text-sm text-gray-500">
                      <p.Icon className="text-red-400 shrink-0 mt-0.5" /> {p.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-700/30 bg-brand-50 p-6 md:p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-brand-700 text-white text-[11px] font-semibold uppercase tracking-wider mb-5">
                  On Dhyana Stays
                </span>
                <div className="flex flex-wrap gap-2 mb-5">
                  {TRAVEL_PURPOSES.map((p) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-white border border-brand-700/20 text-xs font-medium text-gray-900">
                      {p}
                    </span>
                  ))}
                </div>
                <ul className="space-y-3 flex-1">
                  {STORY_ONE_AFTER.map((text) => (
                    <li key={text} className="flex gap-3 text-sm text-gray-900">
                      <IconCheck className="text-brand-700 shrink-0 mt-0.5" /> {text}
                    </li>
                  ))}
                </ul>
                <Link href="/stays" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline mt-4">
                  Explore Stays <IconArrowRight />
                </Link>
              </div>
            </div>
          </div>

          {/* Story 2 — AI Trip Planner */}
          <div className="mt-14">
            <div className="text-center mb-6">
              <span className="text-[11px] font-semibold text-brand-700 uppercase tracking-widest">Story 2 · Planning</span>
              <h4 className="text-lg md:text-2xl font-semibold text-gray-900 mt-1.5">AI Trip Planner</h4>
            </div>
            <div className="grid lg:grid-cols-2 gap-5 items-stretch">
              <div className="rounded-2xl border border-gray-200 bg-surface p-6 md:p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-red-50 text-red-500 text-[11px] font-semibold uppercase tracking-wider mb-5">
                  Traditional Trip Planning
                </span>
                <ul className="space-y-3 flex-1">
                  {STORY_TWO_BEFORE.map((p) => (
                    <li key={p.text} className="flex gap-3 text-sm text-gray-500">
                      <p.Icon className="text-red-400 shrink-0 mt-0.5" /> {p.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-700/30 bg-brand-50 p-6 md:p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-brand-700 text-white text-[11px] font-semibold uppercase tracking-wider mb-5">
                  AI Trip Planner
                </span>
                <div className="flex flex-wrap gap-2 mb-5">
                  {PLANNER_INPUTS.map((p) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-white border border-brand-700/20 text-xs font-medium text-gray-900">
                      {p}
                    </span>
                  ))}
                </div>
                <ul className="space-y-3 flex-1">
                  {STORY_TWO_AFTER.map((text) => (
                    <li key={text} className="flex gap-3 text-sm text-gray-900">
                      <IconCheck className="text-brand-700 shrink-0 mt-0.5" /> {text}
                    </li>
                  ))}
                </ul>
                <Link href="/itineraries/new" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline mt-4">
                  Try the AI Planner <IconArrowRight />
                </Link>
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid md:grid-cols-2 gap-6 mt-16">
            <div className="rounded-2xl border border-gray-200 bg-surface p-6 md:p-7">
              <p className="text-sm font-semibold text-gray-500 mb-5">Traditional Booking Sites</p>
              <ul className="space-y-3">
                {COMPARISON.traditional.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm text-gray-500">
                    <IconX className="text-red-400 shrink-0 mt-0.5" /> {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-brand-700/30 bg-brand-50 p-6 md:p-7">
              <p className="text-sm font-semibold text-brand-700 mb-5">Dhyana Stays</p>
              <ul className="space-y-3">
                {COMPARISON.dhyana.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm text-gray-900">
                    <IconCheck className="text-brand-700 shrink-0 mt-0.5" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PHILOSOPHY ================= */}
      <section className="py-16 md:py-24">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Curation Philosophy</span>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Every Stay Must Earn Its Place
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Every listing goes through admin review before it&apos;s bookable — checked against
            the standards below.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-10">
            {PHILOSOPHY.map((p) => (
              <span key={p} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white card text-sm text-gray-600">
                <IconShieldCheck className="text-brand-700" /> {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WHAT WE OFFER ================= */}
      {offerings.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="container-page">
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">What We Offer</span>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Everything You Need, One Platform
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {offerings.map((o) => (
                <Link
                  key={o.label}
                  href={o.href}
                  className="group bg-surface card-hover rounded-2xl p-6 flex flex-col"
                >
                  <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                    <o.Icon />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{o.label}</h3>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed flex-1">{o.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= PARTNERSHIP MODELS ================= */}
      <section className="py-16 md:py-24">
        <div className="container-page">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Partnership Models</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Two Ways to Build With Us
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {MODELS.map((m, i) => (
              <div key={m.name} className="rounded-2xl border border-gray-200 bg-white p-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Model {i + 1}</span>
                <h3 className="text-base font-semibold text-gray-900 mt-1">{m.name}</h3>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a href="#contact" className="inline-flex items-center gap-2 text-sm text-brand-700 hover:underline">
              Talk to our team about partnering <IconArrowRight />
            </a>
          </div>
        </div>
      </section>

      {/* ================= VALUES ================= */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-page">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Our Values</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              What We Refuse to Compromise
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-surface card-hover rounded-2xl p-6">
                <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                  <v.Icon />
                </span>
                <h3 className="text-sm font-semibold text-gray-900">{v.title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= VISION TIMELINE ================= */}
      <section className="py-16 md:py-24">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Our Vision</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Where This Is Going
            </h2>
          </div>
          <div>
            {VISION.map((v, i) => (
              <div key={v.phase} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${i === 0 ? 'bg-brand-700 text-white' : 'bg-white card text-gray-500'}`}>
                    {v.phase}
                  </span>
                  {i < VISION.length - 1 && <span className="w-px flex-1 bg-gray-200 my-2" />}
                </div>
                <div className="pb-10">
                  <h3 className="text-base font-semibold text-gray-900">{v.title}</h3>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TEAM ================= */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-page">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Meet the Team</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              The People Behind the Stays
            </h2>
            <p className="text-xs text-gray-400 mt-3">Placeholder team — updated with real names and roles before launch.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
            {TEAM.map((t) => (
              <div key={t.role} className="bg-surface card-hover rounded-2xl p-5 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={t.avatar} alt="" aria-hidden="true" className="w-16 h-16 rounded-2xl object-cover mx-auto border-2 border-brand-700/20" />
                <p className="text-sm font-semibold text-gray-900 mt-3">{t.person}</p>
                <p className="text-[11px] text-brand-700 mt-0.5">{t.role}</p>
                <p className="text-[11px] text-gray-400 mt-1.5">{t.note}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                    <IconGlobe />
                  </span>
                  <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                    <IconMegaphone />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= IMPACT ================= */}
      <section className="py-16 md:py-24">
        <div className="container-page">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Our Impact</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Numbers That Tell the Story
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {IMPACT.map((s) => (
              <div key={s.label} className="bg-white card rounded-2xl p-6 text-center">
                <p className="text-2xl md:text-3xl font-bold text-brand-700 tabular-nums">{s.value}</p>
                <p className="text-xs text-gray-500 mt-2">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-6 flex items-center justify-center gap-1.5">
            <IconBarChart /> Illustrative figures — live counters connect to platform analytics at launch.
          </p>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-page">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Testimonials</span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Guests &amp; Hosts
            </h2>
            <p className="text-xs text-gray-400 mt-3">Placeholder quotes — updated with real guest stories before launch.</p>
          </div>
          <div className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
            {TESTIMONIALS.map((t) => (
              <div key={t.id} className="snap-center shrink-0 w-[85%] sm:w-[380px] bg-surface card rounded-2xl p-6 md:p-7">
                <IconQuote className="text-brand-700/30" />
                <p className="text-sm text-gray-600 leading-relaxed mt-3">&ldquo;{t.comment}&rdquo;</p>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-[11px] text-gray-400">{t.location} · {t.stayName}</p>
                  </div>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <IconStar key={i} filled className="text-brand-700 w-3 h-3" />
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-16 md:py-24">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">FAQ</span>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Questions, Answered
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group bg-white card rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 md:px-6 py-4 cursor-pointer list-none text-sm font-medium text-gray-900 hover:bg-surface transition-colors">
                  {f.q}
                  <IconChevronDown className="text-gray-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 md:px-6 pb-5 text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <AboutContactSection />

      {/* ================= FINAL CTA ================= */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Let&apos;s Build the Future of Wellness Travel Together
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Traveller or host — there&apos;s a place for you at Dhyana Stays.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {FINAL_CTAS.map((c) =>
              c.href.startsWith('#') ? (
                <a
                  key={c.label}
                  href={c.href}
                  className="px-6 py-3 text-sm font-semibold rounded-full border border-gray-200 text-gray-900 hover:border-brand-700/50 transition-colors"
                >
                  {c.label}
                </a>
              ) : (
                <Link
                  key={c.label}
                  href={c.href}
                  className={`px-6 py-3 text-sm font-semibold rounded-full transition-colors ${
                    c.primary
                      ? 'bg-brand-700 text-white hover:bg-brand-800'
                      : 'border border-gray-200 text-gray-900 hover:border-brand-700/50'
                  }`}
                >
                  {c.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
