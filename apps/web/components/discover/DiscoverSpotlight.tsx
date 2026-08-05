import Link from 'next/link';
import { IconArrowRight, IconSparkles } from './icons';

/**
 * A fixed, first-party promotional banner. Deliberately NOT wired to any
 * sponsored-listings backend (no such feature exists yet anywhere in this
 * codebase) — this is static marketing content, not real ad inventory, per
 * explicit sign-off on this section's scope.
 */
export default function DiscoverSpotlight() {
  return (
    <section className="container-page pt-2 pb-8 md:pb-12">
      <div className="relative rounded-[32px] overflow-hidden shadow-card min-h-[220px] sm:min-h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
        <div className="relative p-6 sm:p-8 md:p-12 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white/90 rounded-full border border-white/20">
            <IconSparkles className="w-3 h-3" /> Featured
          </span>
          <p className="text-xs text-white/70 uppercase tracking-widest mt-4 mb-1">
            Dhyana Curated Stays
          </p>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
            Architect-Inspected Stays, Handpicked For You
          </h3>
          <p className="text-sm sm:text-base text-white/80 mt-3 leading-relaxed">
            From heritage courtyards to forest cottages — every property on Dhyana is personally inspected before it&apos;s ever listed.
          </p>
          <Link
            href="/stays"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
          >
            Explore <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
