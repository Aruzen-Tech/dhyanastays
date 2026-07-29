"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  ChefHat,
  Leaf,
  Play,
  X,
  Minus,
  Plus,
  Check,
  Quote,
  ArrowRight,
  Sparkles,
  Utensils,
  Users,
  CalendarDays,
  Ticket,
  Clock,
  Megaphone,
  BadgePercent,
} from "lucide-react";
import { foodMenu, type FoodItem } from "@/lib/mock-data";

// ============================================
// Page-local content — menu types, chef stories,
// workshops & testimonials specific to Food.
// ============================================

const menuTypes = [
  {
    icon: Utensils,
    title: "Home-style Thali",
    desc: "Everyday regional thalis, cooked fresh and served at your stay.",
  },
  {
    icon: ChefHat,
    title: "Chef's Tasting Menu",
    desc: "Multi-course tasting menus from our most requested cooks.",
  },
  {
    icon: Users,
    title: "Private Dining",
    desc: "A dedicated cook in your villa's kitchen for a group or celebration.",
  },
  {
    icon: CalendarDays,
    title: "Pre-booked Meal Plans",
    desc: "Line up breakfast, lunch and dinner for your whole stay, in advance.",
  },
];

const chefStories = [
  {
    name: "Meena Akka",
    avatar: "https://i.pravatar.cc/150?img=47",
    role: "Chettinad home cook · Karaikudi",
    dish: "Chettinad Home Thali",
    story:
      "Meena Akka has cooked Chettinad food for forty years, the same stone-ground spice mix her grandmother used. She joined Dhyana in 2023 and now cooks for guests three days a week, between running her own household.",
  },
  {
    name: "Marc D",
    avatar: "https://i.pravatar.cc/150?img=13",
    role: "Baker · Auroville",
    dish: "Auroville Breakfast Basket",
    story:
      "Marc moved to Auroville in 2015 and built his own wood-fired oven by hand. His sourdough starter has been alive since 2019 — he feeds it every morning before the first loaf goes in.",
  },
  {
    name: "Fernando D'Souza",
    avatar: "https://i.pravatar.cc/150?img=15",
    role: "Fisherman-cook · Goa coast",
    dish: "Goan Fish Curry & Rice",
    story:
      "Fernando's family has fished the Goan coast for three generations. He buys the catch himself at the Malim jetty before sunrise — the curry never sees a freezer, only the boat to the pan.",
  },
];

const workshops = [
  {
    title: "Farm-to-Table Cooking Class",
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=800&auto=format&fit=crop",
    location: "Kodaikanal",
    duration: "3 hours",
    price: 1500,
    href: "/experiences/e2",
  },
  {
    title: "Chettinad Cooking Class",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80",
    location: "Stone Valley Farm · Auroville",
    duration: "Half day",
    price: 1200,
    href: "/experiences",
  },
];

const foodTestimonials = [
  {
    name: "Ritika Shah",
    location: "Mumbai",
    avatar: "https://i.pravatar.cc/150?img=5",
    comment: "The Chettinad thali arrived exactly on time and Meena Akka came out to explain every dish. It felt like eating at someone's home, not ordering room service.",
    dish: "Chettinad Home Thali",
  },
  {
    name: "James Whitfield",
    location: "London, UK",
    avatar: "https://i.pravatar.cc/150?img=33",
    comment: "We did the Farm-to-Table cooking class on our second day and then kept cooking what we'd learned for the rest of the trip. Genuinely the highlight of the stay.",
    dish: "Farm-to-Table Cooking Class",
  },
  {
    name: "Ananya Rao",
    location: "Chennai",
    avatar: "https://i.pravatar.cc/150?img=9",
    comment: "Pre-booked all three meals before we even checked in. Zero decision fatigue on holiday, and the Goan fish curry was better than most restaurants we've been to.",
    dish: "Goan Fish Curry & Rice",
  },
];

const cuisines = ["All", ...Array.from(new Set(foodMenu.map((f) => f.cuisine.split(" · ")[0])))];

// Sponsored "Food Hub Tile" placement — same slot the Marketing
// dashboard's regional feed manages (see /marketing/placements).
const foodAds = [
  {
    partner: "Meena's Kitchen · Auroville",
    headline: "Pre-book the Chettinad Feast",
    copy: "Wood-fired thalis cooked to order by Meena Akka — pick your cook, pick your quantity, served at your stay.",
    offer: "FOODIE15 · 15% off",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80",
    href: "#menu",
  },
  {
    partner: "Fernando's Coastal Kitchen · Goa",
    headline: "Book the Goan Fish Curry Workshop",
    copy: "Learn the family recipe straight from the fisherman-cook — includes the morning jetty visit and a full lunch.",
    offer: "Limited seats · this week",
    image: "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=1200&q=80",
    href: "/experiences",
  },
];

export default function CuratedFoodPage() {
  const [cuisine, setCuisine] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [videoDish, setVideoDish] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [cook, setCook] = useState<Record<string, string>>({});
  const [justBooked, setJustBooked] = useState<string | null>(null);
  const [adSlide, setAdSlide] = useState(0);

  useEffect(() => {
    if (foodAds.length < 2) return;
    const t = setInterval(() => setAdSlide((i) => (i + 1) % foodAds.length), 5000);
    return () => clearInterval(t);
  }, []);

  const getQty = (id: string) => qty[id] ?? 1;
  const changeQty = (id: string, d: number) =>
    setQty((p) => ({ ...p, [id]: Math.min(20, Math.max(1, getQty(id) + d)) }));

  const preBook = (id: string) => {
    setJustBooked(id);
    setTimeout(() => setJustBooked((cur) => (cur === id ? null : cur)), 2500);
  };

  const visible = useMemo(
    () =>
      foodMenu.filter((f) => {
        const matchesCuisine = cuisine === "All" || f.cuisine.startsWith(cuisine);
        const matchesVeg = !vegOnly || f.veg;
        const matchesSearch =
          !search.trim() ||
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.cuisine.toLowerCase().includes(search.toLowerCase());
        return matchesCuisine && matchesVeg && matchesSearch;
      }),
    [cuisine, vegOnly, search]
  );

  return (
    <div className="pb-24">
      {/* ================= HERO ================= */}
      <section className="relative h-[56vh] flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2000&auto=format&fit=crop"
          alt="Curated dining"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 w-full mt-16">
          <span className="text-xs uppercase tracking-wider text-primary font-bold mb-4 flex items-center gap-2">
            <ChefHat size={16} /> Dhyana Dining
          </span>
          <h1 className="heading-display text-4xl md:text-6xl text-foreground mb-6">
            Taste the destination.
          </h1>
          <p className="text-lg text-muted max-w-xl mb-8">
            Pre-book home-cooked thalis, meet the cooks behind every dish, and join a hands-on
            cooking workshop — food that&apos;s part of the stay, not an add-on.
          </p>

          <div className="max-w-2xl bg-surface/80 backdrop-blur-md p-2 rounded-2xl border border-border flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes or cuisines…"
                className="w-full pl-12 pr-4 py-3 bg-transparent text-foreground focus:outline-none placeholder-subtle text-sm"
              />
            </div>
            <a
              href="#menu"
              className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors whitespace-nowrap text-center text-sm"
            >
              Find Food
            </a>
          </div>
        </div>
      </section>

      {/* ================= SPONSORED · FOOD HUB ================= */}
      <section className="pt-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden border border-primary/25">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${adSlide * 100}%)` }}
          >
            {foodAds.map((ad) => (
              <div key={ad.headline} className="relative w-full shrink-0 min-h-[220px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.image} alt={ad.headline} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
                <div className="relative p-6 md:p-8 max-w-lg">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white/90 rounded-full border border-white/20">
                      <Megaphone size={11} /> Food Hub · Sponsored
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground rounded-full">
                      <BadgePercent size={11} /> {ad.offer}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 uppercase tracking-widest mb-1">{ad.partner}</p>
                  <h3 className="text-xl md:text-2xl font-semibold text-white">{ad.headline}</h3>
                  <p className="text-sm text-white/80 mt-2 leading-relaxed">{ad.copy}</p>
                  <a
                    href={ad.href}
                    className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
                  >
                    Explore <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="absolute bottom-4 right-6 z-10 flex items-center gap-2">
            {foodAds.map((ad, i) => (
              <button
                key={ad.headline}
                onClick={() => setAdSlide(i)}
                aria-label={`Show ad ${i + 1}: ${ad.headline}`}
                className={`h-1.5 rounded-full transition-all ${i === adSlide ? "w-6 bg-primary" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
          <span className="absolute top-4 right-6 z-10 text-[9px] font-semibold uppercase tracking-wider text-white/60 tabular-nums">
            Ad {adSlide + 1}/{foodAds.length}
          </span>
        </div>
      </section>

      {/* ================= TYPES OF MENUS ================= */}
      <section className="py-16 max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">How you can eat with us</span>
          <h2 className="heading-display text-2xl md:text-4xl text-foreground mt-3">Types of Menus</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {menuTypes.map((m) => (
            <a
              key={m.title}
              href="#menu"
              className="group bg-surface border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors"
            >
              <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <m.icon size={20} />
              </span>
              <h3 className="text-sm font-semibold text-foreground mt-4 group-hover:text-primary transition-colors">{m.title}</h3>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{m.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ================= DISH MENU ================= */}
      <section id="menu" className="py-16 max-w-[1200px] mx-auto px-6 lg:px-8 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Curated Dish Menu</h2>
            <p className="text-sm text-muted mt-1">Choose your cook, set the quantity, pre-book with your stay.</p>
          </div>
          <button
            onClick={() => setVegOnly((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors self-start md:self-auto ${
              vegOnly ? "bg-sage text-white border-sage" : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            <Leaf size={14} /> Veg only
          </button>
        </div>

        {/* Cuisine filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-8 -mx-1 px-1">
          {cuisines.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                cuisine === c ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((f) => (
            <div key={f.id} className="rounded-2xl overflow-hidden bg-surface border border-border hover:border-primary/30 transition-colors flex flex-col">
              <div className="relative h-44 overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.image} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider bg-background/85 backdrop-blur-sm text-foreground rounded-full">
                  {f.veg && <Leaf size={10} className="text-sage" />} {f.cuisine}
                </span>
                {f.story && (
                  <button
                    onClick={() => setVideoDish(f)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group/play"
                    aria-label={`Watch the story behind ${f.name}`}
                  >
                    <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover/play:opacity-100 scale-90 group-hover/play:scale-100 transition-all">
                      <Play size={18} className="text-foreground fill-foreground ml-0.5" />
                    </span>
                  </button>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{f.name}</p>
                  <p className="text-sm font-bold text-primary whitespace-nowrap">₹{f.pricePerPlate}</p>
                </div>
                <p className="text-xs text-subtle mt-0.5">Serves {f.serves}</p>

                {f.story && (
                  <button
                    onClick={() => setVideoDish(f)}
                    className="flex items-center gap-1.5 text-[11px] text-primary mt-2 hover:underline w-fit"
                  >
                    <Play size={10} className="fill-primary" /> Watch the story
                  </button>
                )}

                <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mt-3 mb-1.5 flex items-center gap-1">
                  <ChefHat size={11} /> Choose your cook
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {f.cooks.map((c) => {
                    const selected = (cook[f.id] ?? f.cooks[0].name) === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => setCook((p) => ({ ...p, [f.id]: c.name }))}
                        title={c.specialty}
                        className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-xs transition-colors ${
                          selected ? "border-sage bg-sage/15 text-foreground" : "border-border text-muted hover:border-border-light"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.avatar} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                        {c.name}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-hover">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(f.id, -1)}
                      aria-label="Decrease quantity"
                      className="w-7 h-7 rounded-full border border-border text-muted hover:text-foreground hover:border-border-light flex items-center justify-center transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground tabular-nums">{getQty(f.id)}</span>
                    <button
                      onClick={() => changeQty(f.id, 1)}
                      aria-label="Increase quantity"
                      className="w-7 h-7 rounded-full border border-border text-muted hover:text-foreground hover:border-border-light flex items-center justify-center transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => preBook(f.id)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      justBooked === f.id ? "bg-sage text-white" : "bg-primary text-primary-foreground hover:bg-primary-hover"
                    }`}
                  >
                    {justBooked === f.id ? (
                      <span className="flex items-center gap-1"><Check size={12} /> Pre-booked</span>
                    ) : (
                      `Pre-book · ₹${f.pricePerPlate * getQty(f.id)}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="col-span-full text-center text-sm text-subtle py-12">No dishes match that filter — try clearing search or cuisine.</p>
          )}
        </div>
      </section>

      {/* ================= VIDEO / STORY MODAL ================= */}
      {videoDish && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setVideoDish(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl overflow-hidden max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 bg-black">
              <video
                key={videoDish.id}
                src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                poster={videoDish.image}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setVideoDish(null)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors pointer-events-auto"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">The story behind this dish</p>
              <h3 className="text-lg font-semibold text-foreground mb-2">{videoDish.name}</h3>
              <p className="text-sm text-muted leading-relaxed">{videoDish.story}</p>
              <p className="text-[11px] text-subtle mt-4">Sample preview clip — full recipe videos are filming soon.</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= CHEF STORIES ================= */}
      <section className="py-20 bg-surface/40">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Meet the Kitchen</span>
            <h2 className="heading-display text-2xl md:text-4xl text-foreground mt-3">The Story Behind Every Plate</h2>
            <p className="text-muted mt-3 max-w-xl mx-auto">
              Every cook on Dhyana has a name, a kitchen, and a recipe that means something to them.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {chefStories.map((c) => (
              <div key={c.name} className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-subtle">{c.role}</p>
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed">{c.story}</p>
                <p className="text-[11px] text-primary mt-3 font-medium">Known for: {c.dish}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WORKSHOPS ================= */}
      <section className="py-20 max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Cook alongside us</span>
            <h2 className="heading-display text-2xl md:text-4xl text-foreground mt-3">Culinary Workshops</h2>
            <p className="text-muted mt-3 max-w-lg">
              Not just eating — learn the recipe. Hands-on sessions with the same cooks behind the menu above.
            </p>
          </div>
          <Link href="/experiences" className="hidden md:flex items-center gap-2 text-sm text-primary hover:underline shrink-0">
            All experiences <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {workshops.map((w) => (
            <Link
              key={w.title}
              href={w.href}
              className="group flex flex-col sm:flex-row gap-5 bg-surface border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
            >
              <div className="w-full sm:w-40 h-40 sm:h-auto rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.image} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="flex flex-col justify-center py-1">
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{w.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted mt-2 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {w.location}</span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {w.duration}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-sm font-semibold text-foreground">
                  <Ticket size={13} className="text-primary" /> ₹{w.price.toLocaleString("en-IN")}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/experiences" className="flex md:hidden items-center justify-center gap-2 text-sm text-primary mt-8">
          All experiences <ArrowRight size={14} />
        </Link>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-20 bg-surface/40">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Guest Stories</span>
            <h2 className="heading-display text-2xl md:text-4xl text-foreground mt-3">What Guests Say About the Food</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {foodTestimonials.map((t) => (
              <div key={t.name} className="p-7 rounded-2xl bg-surface border border-border relative">
                <Quote size={28} className="text-primary/20 absolute top-5 right-5" />
                <div className="flex items-center gap-3 mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover border border-border" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-subtle">{t.location}</p>
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed">&ldquo;{t.comment}&rdquo;</p>
                <p className="text-xs text-primary mt-3 font-medium">{t.dish}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CLOSING CTA ================= */}
      <section className="py-20 max-w-[900px] mx-auto px-6 lg:px-8 text-center">
        <Sparkles size={22} className="text-primary mx-auto mb-4" />
        <h2 className="heading-display text-2xl md:text-4xl text-foreground">Are you a cook or a chef?</h2>
        <p className="text-muted mt-3 max-w-lg mx-auto">
          Join Dhyana as a food partner — cook for guests at curated stays, choose your own hours, and get paid per plate.
        </p>
        <Link
          href="/business"
          className="inline-flex items-center gap-2 mt-7 px-7 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
        >
          Apply as a food partner <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
