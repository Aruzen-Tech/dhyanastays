/**
 * Sponsored slots for the hero spotlight carousel.
 *
 * PLACEHOLDER DATA. There is no promotions endpoint yet; this array is the
 * whole integration surface. When the real feed arrives, replace
 * SPONSORED_ADS with the fetched array and nothing downstream changes — the
 * carousel reads this shape and only this shape.
 *
 * ─── Two hrefs below do not resolve in this app today ────────────────────
 * Kept exactly as supplied rather than silently rewritten, because they may
 * be routes you have planned. As of now they 404:
 *
 *   /stays/nila-wellness-retreat  — there is no /stays route. Stay detail
 *                                   pages live at /listings/<id>.
 *   /food                         — no such route exists.
 *
 * These two resolve correctly:
 *   /#explore-stays  — anchor on the home page's results section.
 *   /experiences     — real route (app/experiences).
 *
 * Point them somewhere real before this ships; a dead link in a hero
 * placement is worse than no placement.
 */
export interface SponsoredSlot {
  /** Advertiser name — the small line above the headline. */
  partner: string;
  headline: string;
  copy: string;
  /** Short promotional flag, e.g. "20% off · Jul 20 – Aug 31". */
  offer: string;
  image: string;
  href: string;
}

/**
 * Emptying this array is a supported state: the carousel falls back to
 * featuring real stays from the already-loaded catalog rather than rendering
 * nothing.
 */
export const SPONSORED_ADS: SponsoredSlot[] = [
  {
    partner: 'Nila Wellness Retreat',
    headline: 'Monsoon Wellness Week',
    copy: 'Seven days of Ayurveda, yoga and forest silence in Palakkad — curated by Dr. Lakshmi Nair. Early birds save 20%.',
    offer: '20% off · Jul 20 – Aug 31',
    image: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1200&q=80',
    href: '/stays/nila-wellness-retreat',
  },
  {
    partner: 'Dhyana Curated Stays',
    headline: 'Weekend Escapes Sale',
    copy: 'Fifteen percent off architect-inspected villas, tiny houses and farm stays across Tamil Nadu — this month only.',
    offer: '15% off · Fri–Sun stays',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
    href: '/#explore-stays',
  },
  {
    partner: "Meena's Kitchen · Auroville",
    headline: 'Pre-book the Chettinad Feast',
    copy: 'Wood-fired thalis cooked to order by Meena Akka — pick your cook, pick your quantity, served at your stay.',
    offer: 'FOODIE15 · 15% off',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80',
    href: '/food',
  },
  {
    partner: 'Saffron Knots Events',
    headline: 'Destination Weddings, Curated',
    copy: 'Heritage courtyards, farm lawns and beach decks — 140+ weddings planned across Dhyana properties.',
    offer: 'Free venue visit',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80',
    href: '/experiences',
  },
];
