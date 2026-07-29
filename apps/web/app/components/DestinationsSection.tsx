"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ArrowRight, MapPin } from "lucide-react";
import { destinations } from "@/lib/mock-data";

// ============================================
// HOMEPAGE DESTINATIONS
// Search-as-you-type over a growing destination
// list — the grid below re-flows to match.
// ============================================

export default function DestinationsSection() {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(
      (d) => d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q)
    );
  }, [search]);

  // First 5 form the featured grid (tall lead card + 4). Everything after
  // that scrolls horizontally instead of adding more static rows — keeps
  // the section's height fixed regardless of how many destinations exist.
  const featured = visible.slice(0, 5);
  const rest = visible.slice(5);

  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-3 sm:mb-6 lg:mb-10">
          <span className="text-xs font-semibold text-sage uppercase tracking-widest">
            Destinations
          </span>
          <h2 className="heading-organic text-xl sm:text-3xl lg:text-5xl text-foreground mt-1 sm:mt-2">
            Where Will You Go?
          </h2>

          {/* Search tab */}
          <div className="relative w-full max-w-md mt-3 sm:mt-5 lg:mt-7">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a destination or state…"
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-surface rounded-full text-sm text-foreground placeholder-subtle shadow-organic focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
          </div>
          <p className="text-xs text-subtle mt-2 sm:mt-3">
            {visible.length} of {destinations.length} destinations
          </p>
        </div>

        {visible.length > 0 ? (
          <>
            <div className="relative">
              <div
                className={`flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-2.5 sm:gap-4 -mx-6 px-6 pb-1 sm:grid sm:grid-cols-2 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none stagger-children ${
                  featured.length > 2 ? "lg:grid-cols-3" : ""
                }`}
              >
                {featured.map((dest, i) => (
                  <Link
                    key={dest.name}
                    href={`/stays?destination=${dest.name.toLowerCase()}`}
                    className={`group relative shrink-0 w-[160px] snap-start sm:w-auto sm:shrink rounded-2xl sm:rounded-[28px] overflow-hidden card-hover ${
                      i === 0 && featured.length > 2
                        ? "min-h-[150px] sm:min-h-[320px] lg:row-span-2"
                        : "min-h-[150px] sm:min-h-[200px] lg:min-h-[280px]"
                    }`}
                  >
                    {/* Background */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      loading="lazy"
                      src={dest.image}
                      alt={dest.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
                      <h3 className="text-base sm:text-xl font-semibold text-white group-hover:text-primary transition-colors">
                        {dest.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-white/70 mt-0.5 sm:mt-1">
                        {dest.state} · {dest.properties} properties
                      </p>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full bg-white/10 backdrop-blur-sm text-white/70 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
            </div>

            {/* Remaining destinations — always horizontally scrollable so
                the section never grows past this height, at any screen size. */}
            {rest.length > 0 && (
              <div className="relative mt-2.5 sm:mt-4">
                <div className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-2.5 sm:gap-4 -mx-6 px-6 sm:mx-0 sm:px-0 pb-1">
                  {rest.map((dest) => (
                    <Link
                      key={dest.name}
                      href={`/stays?destination=${dest.name.toLowerCase()}`}
                      className="group relative shrink-0 w-[160px] sm:w-[220px] min-h-[150px] sm:min-h-[180px] snap-start rounded-2xl sm:rounded-[28px] overflow-hidden card-hover"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        loading="lazy"
                        src={dest.image}
                        alt={dest.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
                        <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-primary transition-colors">
                          {dest.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-white/70 mt-0.5">
                          {dest.state} · {dest.properties} properties
                        </p>
                      </div>
                      <div className="absolute top-2.5 right-2.5 p-1.5 sm:p-2 rounded-full bg-white/10 backdrop-blur-sm text-white/70 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        <ArrowRight size={14} />
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <MapPin size={28} className="text-subtle mx-auto mb-3" />
            <p className="text-sm text-subtle">No destination matches &ldquo;{search}&rdquo; yet — more are added every month.</p>
          </div>
        )}
      </div>
    </section>
  );
}
