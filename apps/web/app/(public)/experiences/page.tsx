"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, MapPin, Clock, Star, Quote, ArrowRight, PlayCircle } from "lucide-react";
import { experiences } from "@/lib/mock-data";

const categories = ["All", ...Array.from(new Set(experiences.map((e) => e.category)))];

const experienceTestimonials = [
  {
    name: "Sofia Marchetti",
    location: "Milan, Italy",
    avatar: "https://i.pravatar.cc/150?img=26",
    comment: "The sunrise yoga session was worth waking up at 5am for — watching the light hit the Matrimandir while we moved through the sequence is something I still think about.",
    exp: "Sunrise Yoga at Auroville",
  },
  {
    name: "Karan Mehta",
    location: "Delhi",
    avatar: "https://i.pravatar.cc/150?img=17",
    comment: "Did the trek with my brother and our guide Joseph spotted things we'd have walked right past — elephant tracks, a hornbill nest. Genuinely felt like a nature documentary.",
    exp: "Western Ghats Trek",
  },
  {
    name: "Priya & Arvind",
    location: "Bangalore",
    avatar: "https://i.pravatar.cc/150?img=31",
    comment: "We threw our own bowls at the pottery workshop and had them shipped home three weeks later. Murugan was so patient teaching two total beginners.",
    exp: "Pottery Workshop",
  },
];

export default function ExperiencesPage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () =>
      experiences.filter((exp) => {
        const matchesCategory = category === "All" || exp.category === category;
        const matchesSearch =
          !search.trim() ||
          exp.name.toLowerCase().includes(search.toLowerCase()) ||
          exp.location.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [category, search]
  );

  return (
    <div className="pb-24">
      {/* ================= HERO ================= */}
      <section className="relative h-[56vh] flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2000&auto=format&fit=crop"
          alt="Travel experiences"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 w-full mt-16">
          <h1 className="heading-display text-4xl md:text-6xl text-foreground mb-6">
            Curated Local Experiences.
          </h1>
          <p className="text-lg text-muted max-w-xl mb-8">
            Yoga at dawn, pottery on a riverside wheel, treks with a naturalist — watch the promo,
            meet the host, then book in a few taps.
          </p>

          <div className="max-w-2xl bg-surface/80 backdrop-blur-md p-2 rounded-2xl border border-border flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search experiences or destinations…"
                className="w-full pl-12 pr-4 py-3 bg-transparent text-foreground focus:outline-none placeholder-subtle text-sm"
              />
            </div>
            <a
              href="#grid"
              className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors whitespace-nowrap text-center text-sm"
            >
              Search
            </a>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="py-8 border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 flex gap-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat ? "bg-primary text-primary-foreground" : "bg-surface border border-border text-muted hover:border-subtle"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ================= GRID ================= */}
      <section id="grid" className="py-16 max-w-[1200px] mx-auto px-6 lg:px-8 scroll-mt-20">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-2xl font-semibold text-foreground">
            {category === "All" ? "Trending Experiences" : category}
          </h2>
          <span className="text-sm text-subtle">{visible.length} experiences</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((exp) => (
            <Link href={`/experiences/${exp.id}`} key={exp.id} className="group flex flex-col">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={exp.image} alt={exp.name} className="w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700" />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-background/80 backdrop-blur-md text-foreground text-[10px] uppercase tracking-wider rounded-full border border-border font-semibold">
                    {exp.category}
                  </span>
                </div>
                {exp.video && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <PlayCircle size={40} className="text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all drop-shadow-lg" />
                  </span>
                )}
              </div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1 text-sm text-muted">
                  <MapPin size={14} className="text-primary" /> {exp.location}
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <Star size={14} className="text-primary fill-primary" /> {exp.rating} <span className="text-subtle font-normal">({exp.reviewCount})</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">{exp.name}</h3>
              <p className="text-xs text-subtle line-clamp-2 mb-3">{exp.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted mt-auto">
                <div className="flex items-center gap-1"><Clock size={14} /> {exp.duration}</div>
                <div className="font-semibold text-foreground">From ₹{exp.price}</div>
              </div>
            </Link>
          ))}
          {visible.length === 0 && (
            <p className="col-span-full text-center text-sm text-subtle py-12">No experiences match that search — try another category.</p>
          )}
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-20 bg-surface/40">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Guest Stories</span>
            <h2 className="heading-display text-2xl md:text-4xl text-foreground mt-3">What Guests Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {experienceTestimonials.map((t) => (
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
                <p className="text-xs text-primary mt-3 font-medium">{t.exp}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CLOSING CTA ================= */}
      <section className="py-20 max-w-[900px] mx-auto px-6 lg:px-8 text-center">
        <h2 className="heading-display text-2xl md:text-4xl text-foreground">Run experiences of your own?</h2>
        <p className="text-muted mt-3 max-w-lg mx-auto">
          Join Dhyana as an Experience Host — list your workshop, tour or class and reach every guest booking a stay.
        </p>
        <Link
          href="/business"
          className="inline-flex items-center gap-2 mt-7 px-7 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
        >
          Apply as an experience host <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
