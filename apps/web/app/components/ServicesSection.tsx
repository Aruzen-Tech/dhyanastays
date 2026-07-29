"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Home,
  Compass,
  ArrowRight,
  Star,
  MapPin,
  Sparkles,
  BadgePercent,
  Megaphone,
} from "lucide-react";
import { properties, experiences } from "@/lib/mock-data";
import PropertyCard from "./PropertyCard";

// ============================================
// HOMEPAGE SERVICES HUB
// A focused hub for Dhyana's two core offerings —
// curated stays and curated experiences.
// ============================================

const tabs = [
  { key: "stays", label: "Curated Stays", icon: Home },
  { key: "experiences", label: "Curated Experiences", icon: Compass },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const viewAll: Record<TabKey, { href: string; label: string }> = {
  stays: { href: "/stays", label: "View all stays" },
  experiences: { href: "/experiences", label: "All experiences" },
};

export default function ServicesSection() {
  const [tab, setTab] = useState<TabKey>("stays");

  const featured = properties.filter((p) => p.isFeatured).slice(0, 3);

  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
      <div className="rounded-2xl sm:rounded-[32px] bg-surface-hover p-3.5 sm:p-5 md:p-10 lg:p-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-3 sm:mb-5 lg:mb-8">
          <div>
            <span className="text-xs font-semibold text-sage uppercase tracking-widest">
              One platform · Every experience
            </span>
            <h2 className="heading-organic text-xl sm:text-3xl lg:text-5xl text-foreground mt-1 sm:mt-2">
              Explore Dhyana Services
            </h2>
            <p className="text-muted text-sm sm:text-base mt-1.5 sm:mt-3 max-w-lg">
              Handpicked stays and curated experiences — inspected and
              bookable in one place.
            </p>
          </div>
          <Link
            href={viewAll[tab].href}
            className="hidden md:flex items-center gap-2 text-sm text-primary hover:underline shrink-0"
          >
            {viewAll[tab].label} <ArrowRight size={14} />
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-5 lg:mb-10">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium border whitespace-nowrap transition-all ${
                tab === key
                  ? "bg-primary text-primary-foreground border-primary shadow-organic"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-border-light"
              }`}
            >
              <Icon size={14} className="sm:hidden" />
              <Icon size={15} className="hidden sm:block" />
              {label}
            </button>
          ))}
        </div>

        {/* ============ STAYS ============ */}
        {tab === "stays" && (
          <div className="relative flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-3 md:gap-6 -mx-6 px-6 pb-1 md:grid md:grid-cols-2 md:mx-0 md:px-0 md:pb-0 md:overflow-visible md:snap-none lg:grid-cols-3 stagger-children">
            {featured.map((property) => (
              <div key={property.id} className="shrink-0 w-[220px] snap-start md:w-auto md:shrink">
                <PropertyCard property={property} />
              </div>
            ))}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface-hover to-transparent md:hidden" />
          </div>
        )}

        {/* ============ EXPERIENCES ============ */}
        {tab === "experiences" && (
          <div className="relative flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-3 sm:gap-6 -mx-6 px-6 pb-1 sm:grid sm:grid-cols-2 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none lg:grid-cols-4 stagger-children">
            {experiences.map((exp) => (
              <Link
                key={exp.id}
                href={`/experiences/${exp.id}`}
                className="group shrink-0 w-[175px] snap-start sm:w-auto sm:shrink rounded-2xl sm:rounded-[28px] overflow-hidden bg-surface card-hover"
              >
                <div className="relative h-28 sm:h-40 overflow-hidden bg-surface-hover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy"
                    src={exp.image}
                    alt={exp.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider bg-white/85 backdrop-blur-sm text-sage rounded-full">
                    {exp.category}
                  </span>
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-0.5 sm:mb-1 line-clamp-1">
                    {exp.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5 sm:mb-2">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{exp.location} · {exp.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-primary fill-primary" />
                      <span className="text-xs font-medium text-foreground">{exp.rating}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      ₹{exp.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface-hover to-transparent sm:hidden" />
          </div>
        )}

        {/* Mobile view-all */}
        <div className="mt-8 md:hidden">
          <Link
            href={viewAll[tab].href}
            className="flex items-center justify-center gap-2 text-sm text-primary"
          >
            {viewAll[tab].label} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      </div>
    </section>
  );
}

// ============================================
// SPOTLIGHT AD SLOT (Module 24 — Marketing)
// A dedicated promoted space. When a partner has
// booked the slot it shows their showcase; when
// empty it falls back to AI suggestions.
// ============================================

interface SponsoredSlot {
  partner: string;
  headline: string;
  copy: string;
  offer: string;
  image: string;
  href: string;
}

// Empty the array to see the AI-suggestions fallback.
// Multiple ads play in rotation, sliding right → left.
const sponsoredAds: SponsoredSlot[] = [
  {
    partner: "Nila Wellness Retreat",
    headline: "Monsoon Wellness Week",
    copy: "Seven days of Ayurveda, yoga and forest silence in Palakkad — curated by Dr. Lakshmi Nair. Early birds save 20%.",
    offer: "20% off · Jul 20 – Aug 31",
    image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1200&q=80",
    href: "/stays/nila-wellness-retreat",
  },
  {
    partner: "Dhyana Curated Stays",
    headline: "Weekend Escapes Sale",
    copy: "Fifteen percent off architect-inspected villas, tiny houses and farm stays across Tamil Nadu — this month only.",
    offer: "15% off · Fri–Sun stays",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
    href: "/stays",
  },
  {
    partner: "Meena's Kitchen · Auroville",
    headline: "Pre-book the Chettinad Feast",
    copy: "Wood-fired thalis cooked to order by Meena Akka — pick your cook, pick your quantity, served at your stay.",
    offer: "FOODIE15 · 15% off",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80",
    href: "/food",
  },
  {
    partner: "Saffron Knots Events",
    headline: "Destination Weddings, Curated",
    copy: "Heritage courtyards, farm lawns and beach decks — 140+ weddings planned across Dhyana properties.",
    offer: "Free venue visit",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    href: "/experiences",
  },
];

export function SpotlightSection() {
  const suggestions = [...properties]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  // Sliding ads: track moves right → left, one ad every 5s
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (sponsoredAds.length < 2) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % sponsoredAds.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="pt-10 md:pt-14 pb-4 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {sponsoredAds.length > 0 ? (
          /* ---- Sponsored ads: right-to-left slider ---- */
          <div className="relative rounded-[32px] overflow-hidden shadow-organic">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {sponsoredAds.map((ad) => (
                <div key={ad.headline} className="relative w-full shrink-0 min-h-[220px] sm:min-h-[300px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy"
                    src={ad.image}
                    alt={ad.headline}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
                  <div className="relative p-4 sm:p-5 md:p-8 lg:p-12 max-w-xl">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4 flex-wrap">
                      <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white/90 rounded-full border border-white/20">
                        <Megaphone size={11} /> Spotlight · Sponsored
                      </span>
                      <span className="flex items-center gap-1 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground rounded-full">
                        <BadgePercent size={11} /> {ad.offer}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 uppercase tracking-widest mb-1">
                      {ad.partner}
                    </p>
                    <h3 className="heading-organic text-lg sm:text-2xl md:text-4xl text-white">
                      {ad.headline}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/80 mt-1.5 sm:mt-3 leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {ad.copy}
                    </p>
                    <Link
                      href={ad.href}
                      className="inline-flex items-center gap-2 mt-3 sm:mt-6 px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
                    >
                      Explore <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Dots */}
            <div className="absolute bottom-4 right-6 z-10 flex items-center gap-2">
              {sponsoredAds.map((ad, i) => (
                <button
                  key={ad.headline}
                  onClick={() => setSlide(i)}
                  aria-label={`Show ad ${i + 1}: ${ad.headline}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slide ? "w-6 bg-primary" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
            <span className="absolute top-4 right-6 z-10 text-[9px] font-semibold uppercase tracking-wider text-white/60 tabular-nums">
              Ad {slide + 1}/{sponsoredAds.length}
            </span>
          </div>
        ) : (
          /* ---- Fallback: AI suggestions fill the slot ---- */
          <div className="rounded-[32px] bg-surface-hover shadow-organic p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={15} className="text-sage" />
              <p className="text-sm font-semibold text-foreground">
                Suggested for you
              </p>
              <span className="text-[10px] text-subtle uppercase tracking-wider">
                AI picked · based on your preferences
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {suggestions.map((p) => (
                <Link
                  key={p.id}
                  href={`/stays/${p.slug}`}
                  className="flex gap-3 rounded-[18px] bg-surface p-2.5 shadow-organic hover:-translate-y-0.5 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy"
                    src={p.images[0]}
                    alt={p.name}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Star size={10} className="text-primary fill-primary" />
                      {p.rating} · {p.location.city}
                    </p>
                    <p className="text-xs text-foreground font-semibold mt-1">
                      ₹{p.price.toLocaleString("en-IN")}/night
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
