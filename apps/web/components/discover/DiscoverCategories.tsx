import Link from 'next/link';
import { categories } from '../../lib/discover-mock-data';
import { IconArrowRight } from './icons';

// 3D emoji renders (Microsoft Fluent 3D, MIT licensed) — one per category.
const FLUENT_3D = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';
const ICON_MAP: Record<string, string> = {
  Home: `${FLUENT_3D}/House/3D/house_3d.png`,
  Sprout: `${FLUENT_3D}/Seedling/3D/seedling_3d.png`,
  Heart: `${FLUENT_3D}/Lotus/3D/lotus_3d.png`,
  Crown: `${FLUENT_3D}/Crown/3D/crown_3d.png`,
  Leaf: `${FLUENT_3D}/Herb/3D/herb_3d.png`,
  Landmark: `${FLUENT_3D}/Classical building/3D/classical_building_3d.png`,
  Laptop: `${FLUENT_3D}/Laptop/3D/laptop_3d.png`,
  HeartHandshake: `${FLUENT_3D}/Two hearts/3D/two_hearts_3d.png`,
  Users: `${FLUENT_3D}/People hugging/3D/people_hugging_3d.png`,
  PawPrint: `${FLUENT_3D}/Paw prints/3D/paw_prints_3d.png`,
  Mountain: `${FLUENT_3D}/Camping/3D/camping_3d.png`,
  Castle: `${FLUENT_3D}/Castle/3D/castle_3d.png`,
};

/**
 * "Find Your Perfect Escape" category grid. UI-only for now: `categories` is
 * static mock content (see lib/discover-mock-data.ts), not derived from real
 * listing data — these 12 category names don't correspond to any field the
 * backend currently exposes, so links are placeholders pending that pass.
 */
export default function DiscoverCategories() {
  return (
    <section className="py-8 md:py-14 bg-surface">
      <div className="container-page">
        <div className="flex items-end justify-between mb-5 lg:mb-10">
          <div>
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">
              Explore
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-1 sm:mt-2">
              Find Your Perfect Escape
            </h2>
          </div>
          <Link
            href="/stays"
            className="hidden md:flex items-center gap-2 text-sm text-orange-500 hover:underline shrink-0"
          >
            View All <IconArrowRight />
          </Link>
        </div>

        <div className="relative">
          <div className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-3 -mx-4 px-4 pb-1 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.slug}
                href={`/stays?category=${cat.slug}`}
                className="group shrink-0 w-[108px] snap-start sm:w-auto p-4 sm:p-6 rounded-2xl sm:rounded-[28px] bg-white shadow-card hover:shadow-card-hover transition-shadow text-center"
              >
                <div className="w-9 h-9 sm:w-16 sm:h-16 mx-auto mb-2.5 sm:mb-4 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    src={ICON_MAP[cat.icon]}
                    alt=""
                    aria-hidden="true"
                    className="w-8 h-8 sm:w-14 sm:h-14 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:rotate-[-4deg]"
                  />
                </div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-0.5 leading-tight">
                  {cat.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-400">{cat.count} stays</p>
              </Link>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent sm:hidden" />
        </div>
      </div>
    </section>
  );
}
