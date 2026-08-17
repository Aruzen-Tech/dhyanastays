import Link from 'next/link';
import BrandMark from '../BrandMark';
import { IconClock, IconMapPin, IconPhone } from '../explore-stays/icons';
import { EXPLORE_CONTAINER_CLASS } from '../../lib/exploreLayout';

const COPYRIGHT_YEAR = 2026;

const contactInfo = [
  { icon: IconMapPin, label: 'ECR Road, Auroville, Tamil Nadu' },
  { icon: IconClock, label: 'Support available every day, 24×7' },
  { icon: IconPhone, label: '+91 98400 36900', href: 'tel:+919840036900' },
];

/**
 * Every link below points to a route that actually exists and renders in
 * this app (confirmed by walking app/, then verifying each URL resolves —
 * `/host` and `/investor` themselves have no page.tsx at their root, so
 * they were swapped for the same real entry points the navbar itself uses:
 * /dashboard for "Host Dashboard" (lib/navigation.ts routes HOST's own
 * "Dashboard" nav item there, not to /host) and /investor/portfolio for the
 * investor section (there's no bare /investor link anywhere in the existing
 * nav either). The reference design this was built from also had
 * About/Blog/Careers/Press/Contact, Terms/Privacy/Cookies, a Quality
 * Standards/Host Resources/Investor FAQ, and 6 stay-category links — none of
 * which have a real page here, so per explicit product direction they were
 * left out entirely rather than linking to pages that 404 or inventing new
 * routes (out of scope for a footer UI redesign).
 */
const footerSections = [
  {
    title: 'Explore',
    links: [
      { label: 'Explore Stays', href: '/' },
      { label: 'Experiences', href: '/experiences' },
    ],
  },
  {
    title: 'For Hosts',
    links: [
      { label: 'Host Dashboard', href: '/dashboard' },
      { label: 'List Your Property', href: '/host/listings/new' },
    ],
  },
  {
    title: 'For Investors',
    links: [
      { label: 'Portfolio', href: '/investor/portfolio' },
      { label: 'Distributions', href: '/investor/distributions' },
    ],
  },
];

const focusRingClassName =
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2';

export default function Footer() {
  return (
    /* `bg-surface`, not `bg-white`: the footer was only white because the
       page was. Left hardcoded it would become a white slab under the new
       sage background instead of the page running to the bottom. */
    <footer className="border-t border-gray-200 bg-surface mt-16">
      {/* Same EXPLORE_CONTAINER_CLASS the Explore hero and stays listing
          section use, so the footer's left/right edges line up with them
          exactly rather than using the site-wide (wider) container-page. */}
      <div className={`${EXPLORE_CONTAINER_CLASS} py-10 lg:py-16`}>
        {/* Contact band */}
        <div className="mb-10 rounded-3xl bg-brand-50 p-6 sm:p-8 lg:mb-14 lg:p-10">
          <div className="grid gap-5 sm:grid-cols-3">
            {contactInfo.map((c) => {
              const inner = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-card">
                    <c.icon />
                  </span>
                  <span className="text-sm text-gray-600">{c.label}</span>
                </>
              );
              return c.href ? (
                <a
                  key={c.label}
                  href={c.href}
                  className={`flex items-center gap-3 transition-colors hover:text-brand-700 ${focusRingClassName}`}
                >
                  {inner}
                </a>
              ) : (
                <div key={c.label} className="flex items-center gap-3">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-1 gap-8 pb-10 sm:grid-cols-3 lg:gap-12 lg:pb-14">
          {footerSections.map((section) => {
            const headingId = `footer-heading-${section.title.toLowerCase().replace(/\s+/g, '-')}`;
            return (
              <nav key={section.title} aria-labelledby={headingId}>
                <h2
                  id={headingId}
                  className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-700"
                >
                  {section.title}
                </h2>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`text-sm text-gray-500 transition-colors hover:text-gray-900 ${focusRingClassName}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}
        </div>

        {/* Bottom bar — brand + copyright + locale, matching the previous
            footer's existing content/behavior exactly. */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span className="font-bold tracking-tight text-brand-700">
              Dhyana Stays
            </span>
          </div>
          <p className="text-center text-sm text-gray-500">
            © {COPYRIGHT_YEAR} Dhyana Stays. Curated wellness retreats across India.
          </p>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>INR · India</span>
            <span>English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
