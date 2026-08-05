import Link from 'next/link';
import { blogPosts } from '../../lib/discover-mock-data';
import { IconArrowRight } from './icons';

/**
 * "From the Journal" — blog teaser grid. UI-only for now: `blogPosts` is
 * static mock content (see lib/discover-mock-data.ts); /blog doesn't exist
 * yet in this app, pending the backend/CMS integration pass.
 */
export default function DiscoverJournal() {
  return (
    <section className="py-8 md:py-14 bg-surface">
      <div className="container-page">
        <div className="flex items-end justify-between mb-5 lg:mb-10">
          <div>
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">
              Stories & Inspiration
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-1 sm:mt-2">
              From the Journal
            </h2>
          </div>
          <Link
            href="/blog"
            className="hidden md:flex items-center gap-2 text-sm text-orange-500 hover:underline"
          >
            All Articles <IconArrowRight />
          </Link>
        </div>

        <div className="relative">
          <div className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-3 md:gap-6 -mx-4 px-4 pb-1 md:grid md:grid-cols-2 md:mx-0 md:px-0 md:pb-0 md:overflow-visible md:snap-none lg:grid-cols-4">
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group shrink-0 w-[220px] snap-start md:w-auto md:shrink rounded-2xl md:rounded-[28px] overflow-hidden bg-white shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="relative h-32 md:h-44 overflow-hidden bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 md:p-5">
                  <span className="text-[10px] font-medium text-brand-700 uppercase tracking-wider">
                    {post.category}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 mt-1.5 mb-1.5 group-hover:text-orange-500 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2.5">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{post.date}</span>
                    <span>{post.readTime} read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent md:hidden" />
        </div>
      </div>
    </section>
  );
}
