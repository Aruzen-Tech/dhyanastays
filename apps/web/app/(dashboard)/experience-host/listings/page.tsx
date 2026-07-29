"use client";

import { useState } from "react";
import { Camera, Star, Clock, MapPin, Plus, Pencil, Eye, Users } from "lucide-react";
import { PageHeader, StatGrid, StatusPill } from "@/app/components/DashboardUI";
import { experiences } from "@/lib/mock-data";

// ============================================
// EXPERIENCE HOST — Listings
// Workshops · Adventure · Photography · Wellness
// ============================================

const categories = ["All", "Wellness", "Food", "Adventure", "Culture", "Nature", "Photography"] as const;
type Category = (typeof categories)[number];

// Listing status per experience (mock)
const meta: Record<string, { status: string; tone: "sage" | "primary" | "muted"; booked: number; capacity: number }> = {
  e1: { status: "Live", tone: "sage", booked: 68, capacity: 12 },
  e2: { status: "Live", tone: "sage", booked: 41, capacity: 8 },
  e3: { status: "Live", tone: "sage", booked: 23, capacity: 10 },
  e4: { status: "Paused", tone: "muted", booked: 35, capacity: 8 },
  e5: { status: "Live", tone: "sage", booked: 52, capacity: 15 },
  e6: { status: "Draft", tone: "primary", booked: 12, capacity: 6 },
};

export default function ExperienceListingsPage() {
  const [cat, setCat] = useState<Category>("All");
  const visible = experiences.filter((e) => cat === "All" || e.category === cat);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Experience Listings"
        subtitle="Your workshops, adventure activities, photography tours and wellness programs."
        action={{ label: "New Experience", href: "/experience-host/listings", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Total Listings", value: "6", delta: "4 live · 1 paused · 1 draft", icon: Camera },
          { label: "Bookings · July", value: "231", delta: "across all experiences", icon: Users },
          { label: "Best Seller", value: "Sunrise Yoga", delta: "68 bookings", icon: Star },
          { label: "Avg Fill Rate", value: "74%", delta: "+6% MoM" },
        ]}
      />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
              cat === c
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Listing cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {visible.map((e) => {
          const m = meta[e.id] ?? { status: "Live", tone: "sage" as const, booked: 0, capacity: 10 };
          return (
            <div key={e.id} className="bg-surface border border-border rounded-2xl overflow-hidden card-hover">
              <div className="relative h-40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={e.image} alt={e.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider bg-background/85 backdrop-blur-sm text-foreground rounded-full">
                  {e.category}
                </span>
                <span className="absolute top-3 right-3">
                  <StatusPill tone={m.tone}>{m.status}</StatusPill>
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-foreground leading-snug">{e.name}</p>
                <p className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin size={10} /> {e.location}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {e.duration}</span>
                </p>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-foreground font-semibold">₹{e.price}<span className="text-subtle font-normal">/person</span></span>
                  <span className="flex items-center gap-1 text-muted">
                    <Star size={11} className="text-primary fill-primary" /> {e.rating} ({e.reviewCount})
                  </span>
                </div>
                <p className="text-[11px] text-subtle mt-2">
                  {m.booked} bookings · max {m.capacity} guests/session
                </p>
                <div className="flex gap-2 mt-3 pt-3 border-t border-surface-hover">
                  <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors">
                    <Pencil size={11} /> Edit
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors">
                    <Eye size={11} /> Preview
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="text-sm text-muted text-center py-10 bg-surface border border-border rounded-2xl">
          No {cat.toLowerCase()} experiences yet — create one with “New Experience”.
        </p>
      )}
    </div>
  );
}
