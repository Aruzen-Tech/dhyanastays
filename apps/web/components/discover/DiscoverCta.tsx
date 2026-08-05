import Link from 'next/link';
import { IconArrowRight } from './icons';

/**
 * Closing "For Property Owners" / "For Investors" split CTA. Links reuse
 * this app's real existing routes (same ones Footer.tsx already settled on)
 * rather than the reference's nonexistent /business and /investor pages.
 */
export default function DiscoverCta() {
  return (
    <section className="py-8 md:py-14 bg-surface">
      <div className="container-page">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="relative rounded-2xl sm:rounded-[32px] overflow-hidden p-6 sm:p-10 lg:p-14 bg-orange-500 shadow-card">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">
              For Property Owners
            </span>
            <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mt-2 sm:mt-3 mb-2 sm:mb-4">
              List Your Stay
            </h3>
            <p className="text-sm text-white/85 mb-4 sm:mb-8 max-w-sm leading-relaxed">
              Join India&apos;s most prestigious curated stays network. Our architecture team will inspect, score, and elevate your property.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-orange-600 font-semibold text-sm rounded-full shadow-card hover:-translate-y-0.5 transition-all"
            >
              Apply as Host <IconArrowRight />
            </Link>
          </div>

          <div className="relative rounded-2xl sm:rounded-[32px] overflow-hidden p-6 sm:p-10 lg:p-14 bg-brand-700 shadow-card">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">
              For Investors
            </span>
            <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mt-2 sm:mt-3 mb-2 sm:mb-4">
              Invest in Hospitality
            </h3>
            <p className="text-sm text-white/85 mb-4 sm:mb-8 max-w-sm leading-relaxed">
              Fractional ownership of curated stays with transparent ROI tracking, professional management, and monthly revenue distribution.
            </p>
            <Link
              href="/investor/portfolio"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-brand-700 font-semibold text-sm rounded-full shadow-card hover:-translate-y-0.5 transition-all"
            >
              Explore Projects <IconArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
