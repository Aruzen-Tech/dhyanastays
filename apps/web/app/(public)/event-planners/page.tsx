"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Star, PartyPopper, ArrowRight, ShieldCheck } from "lucide-react";
import { eventPlanners } from "@/lib/mock-data";

const types = ["All", ...Array.from(new Set(eventPlanners.map((p) => p.type)))];

export default function EventPlannersPage() {
  const [type, setType] = useState("All");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () =>
      eventPlanners.filter((p) => {
        const matchesType = type === "All" || p.type === type;
        const matchesSearch =
          !search.trim() ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
        return matchesType && matchesSearch;
      }),
    [type, search]
  );

  return (
    <div className="pb-24">
      {/* ================= HERO ================= */}
      <section className="relative h-[56vh] flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=80"
          alt="Curated event planning"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 w-full mt-16">
          <span className="text-xs uppercase tracking-wider text-primary font-bold mb-4 flex items-center gap-2">
            <PartyPopper size={16} /> Dhyana Events
          </span>
          <h1 className="heading-display text-4xl md:text-6xl text-foreground mb-6">
            Celebrate it at a curated stay.
          </h1>
          <p className="text-lg text-muted max-w-xl mb-8">
            Weddings, surprises, and team retreats — see past work, download a brochure, and book
            straight through to payment.
          </p>

          <div className="max-w-2xl bg-surface/80 backdrop-blur-md p-2 rounded-2xl border border-border flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search planners or event types…"
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

      {/* ================= TYPE FILTER ================= */}
      <section className="py-8 border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 flex gap-3 overflow-x-auto scrollbar-hide">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                type === t ? "bg-primary text-primary-foreground" : "bg-surface border border-border text-muted hover:border-subtle"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* ================= GRID ================= */}
      <section id="grid" className="py-16 max-w-[1200px] mx-auto px-6 lg:px-8 scroll-mt-20">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-2xl font-semibold text-foreground">Curated Event Planners</h2>
          <span className="text-sm text-subtle">{visible.length} planners</span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {visible.map((p) => (
            <Link
              key={p.id}
              href={`/event-planners/${p.id}`}
              className="group rounded-2xl overflow-hidden bg-surface border border-border hover:border-primary/40 transition-colors"
            >
              <div className="relative h-48 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider bg-background/80 backdrop-blur-sm text-primary rounded-full">
                  {p.type}
                </span>
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 text-xs bg-background/80 backdrop-blur-sm text-foreground rounded-full">
                  <Star size={11} className="text-primary fill-primary" /> {p.rating}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5">
                  <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                  <ShieldCheck size={14} className="text-sage" />
                </div>
                <p className="text-xs text-muted mt-0.5">{p.eventsDone}+ events curated with Dhyana</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-hover">
                  <p className="text-xs text-muted">
                    From <span className="text-sm font-bold text-foreground">₹{p.startingPrice.toLocaleString("en-IN")}</span>
                  </p>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                    View & book <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {visible.length === 0 && (
            <p className="col-span-full text-center text-sm text-subtle py-12">No planners match that search.</p>
          )}
        </div>
      </section>

      {/* ================= CLOSING CTA ================= */}
      <section className="py-20 max-w-[900px] mx-auto px-6 lg:px-8 text-center">
        <h2 className="heading-display text-2xl md:text-4xl text-foreground">Planning events yourself?</h2>
        <p className="text-muted mt-3 max-w-lg mx-auto">
          Join Dhyana as an event planning partner — get matched with guests booking weddings, surprises and retreats.
        </p>
        <Link
          href="/business"
          className="inline-flex items-center gap-2 mt-7 px-7 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
        >
          Apply as an event partner <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
