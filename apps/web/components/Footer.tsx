'use client';

/**
 * Global site footer — rendered once from the root layout, appears on every
 * page (same placement the previous inline footer already had).
 *
 * UI modeled on the ReferenceUI design brief. Every link below resolves to a
 * real route in this app — the reference linked to pages that don't exist
 * here (/blog, /careers, /press, /become-a-host, /quality-standards,
 * /host-resources, /investor/calculator, /investor/projects, /faq, /terms,
 * /privacy, /cookies) and to /stays?category=X query params Explore Stays
 * doesn't read (it filters via local component state, not the URL). Rather
 * than ship dead links or links that silently do nothing, this footer links
 * only to pages that exist, using this app's own route structure:
 *   Explore     → / · /experiences · /stays
 *   Company     → /about · /about#contact
 *   For Hosts   → /auth/register · /dashboard
 *   For Investors → /investor/portfolio · /investor/capital-calls ·
 *                   /investor/distributions · /investor/documents
 * Social icons are omitted because the reference itself has them commented
 * out (no real profiles wired up there either).
 *
 * The newsletter field is intentionally inert — see the AskUserQuestion
 * report: no subscription backend exists anywhere in this app, and none was
 * added here. Submitting does nothing, matching the reference's own
 * behavior (its input/button have no onSubmit or onClick at all).
 */

import Link from 'next/link';

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconClock({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconPhone({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}

/** Placeholder — same values shown on the About Us contact section, kept
 * consistent across the app. Swap for the real address/hours/phone. */
const CONTACT_INFO = [
  { Icon: IconMapPin, label: 'Placeholder address — update before launch' },
  { Icon: IconClock, label: 'Mon–Fri, 9am to 6pm IST' },
  { Icon: IconPhone, label: '+91 98765 43210' },
];

const FOOTER_SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Explore Stays', href: '/stays' },
      { label: 'Experiences', href: '/experiences' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact Us', href: '/about#contact' },
    ],
  },
  {
    title: 'For Hosts',
    links: [
      { label: 'List Your Property', href: '/auth/register' },
      { label: 'Host Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'For Investors',
    links: [
      { label: 'Portfolio', href: '/investor/portfolio' },
      { label: 'Capital Calls', href: '/investor/capital-calls' },
      { label: 'Distributions', href: '/investor/distributions' },
      { label: 'Documents', href: '/investor/documents' },
    ],
  },
];

const COPYRIGHT_YEAR = 2026;

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-16">
      <div className="container-page py-8 sm:py-12 lg:py-16">
        {/* Newsletter + contact band */}
        <div className="rounded-2xl sm:rounded-[28px] bg-surface p-5 sm:p-8 lg:p-10 mb-8 lg:mb-14">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 lg:gap-8">
            <div>
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Stay Inspired
              </h3>
              <p className="text-gray-500 text-sm max-w-md mt-2">
                Curated retreats, new destinations, and offers — delivered to your inbox.
              </p>
            </div>
            {/*
              Inert by design — no subscription backend exists, none was added.
              See the "Newsletter Subscription" item in the implementation report.
            */}
            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              <label htmlFor="footer-newsletter-email" className="sr-only">Email address</label>
              <input
                id="footer-newsletter-email"
                type="email"
                disabled
                placeholder="Newsletter coming soon"
                className="flex-1 lg:w-72 px-5 py-3 bg-white border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:border-brand-700 transition-colors"
              />
              <button
                type="button"
                disabled
                title="Newsletter subscription isn't available yet"
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-gray-300 rounded-full whitespace-nowrap cursor-not-allowed"
              >
                Subscribe
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 mt-6 pt-6 border-t border-gray-200">
            {CONTACT_INFO.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                  <c.Icon />
                </span>
                <span className="text-sm text-gray-500">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 pb-8 lg:pb-12">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-brand-700 uppercase tracking-widest mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center shrink-0">
              <span className="text-sm" aria-hidden="true">🏡</span>
            </div>
            <span className="font-semibold text-brand-700 tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Dhyana Stays
            </span>
            <span className="text-gray-400 text-sm ml-1">
              © {COPYRIGHT_YEAR}. Curated wellness retreats across India.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
