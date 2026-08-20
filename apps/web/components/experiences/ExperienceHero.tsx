interface Props {
  /** Real, already-fetched count (experiences.length in app/experiences/page.tsx). */
  count: number;
}

/**
 * Same title/description copy the page has always used — only the visual
 * treatment changes (eyebrow + serif "hero moment" heading, matching the
 * one other genuine hero on the site, ExploreHero). Deliberately compact:
 * no illustration/image grid here, since Experience has no guaranteed
 * photo to build a collage from, and a tall hero would push real results
 * below the fold on a filter-heavy page.
 */
export default function ExperienceHero({ count }: Props) {
  return (
    /* border-gray-200: gray-100 is nearly identical to the new --surface, so
       a divider on a page-coloured section needs the next step up. */
    <div className="border-b border-gray-200 bg-surface">
      <div className="container-page py-10 lg:py-12">
        <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
          Experiences
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-gray-900 sm:text-[2.75rem]">
            Wellness experiences
          </h1>
          {count > 0 && (
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-brand-700">{count}</span> curated {count === 1 ? 'session' : 'sessions'}
            </p>
          )}
        </div>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-500">
          Yoga classes, ayurveda sessions, guided hikes, and retreats hosted across India.
        </p>
      </div>
    </div>
  );
}
