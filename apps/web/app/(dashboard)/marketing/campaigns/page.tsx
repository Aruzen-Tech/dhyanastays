"use client";

import { useState } from "react";
import {
  Megaphone,
  Plus,
  Pause,
  Play,
  MapPin,
  Eye,
  MousePointerClick,
  CalendarDays,
} from "lucide-react";
import { PageHeader, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// MARKETING — Campaigns
// Region-targeted campaigns in app placements
// ============================================

const regionFilters = ["All regions", "All India", "Tamil Nadu", "Pondicherry", "Kerala", "Karnataka"] as const;
type Region = (typeof regionFilters)[number];

interface Campaign {
  id: string;
  name: string;
  image: string;
  placement: string;
  region: Exclude<Region, "All regions">;
  window: string;
  budget: string;
  impressions: string;
  clicks: string;
  live: boolean;
  ended?: boolean;
}

const initialCampaigns: Campaign[] = [
  { id: "cmp1", name: "Monsoon Wellness Week", image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=70", placement: "Homepage Spotlight", region: "All India", window: "Jul 20 – Aug 31", budget: "₹60,000", impressions: "84.2k", clicks: "3.1k", live: true },
  { id: "cmp2", name: "Weekend Escapes · 15% off", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70", placement: "Stays Top Banner", region: "Tamil Nadu", window: "Jul 01 – Jul 31", budget: "₹35,000", impressions: "52.6k", clicks: "2.4k", live: true },
  { id: "cmp3", name: "Pre-book Chettinad Feast", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=70", placement: "Food Hub Tile", region: "Pondicherry", window: "Jul 10 – Aug 10", budget: "₹18,000", impressions: "21.9k", clicks: "1.6k", live: true },
  { id: "cmp4", name: "Full Moon Folk Festival", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=70", placement: "Events Banner", region: "Tamil Nadu", window: "Jul 18 – Jul 31", budget: "₹12,000", impressions: "9.4k", clicks: "880", live: true },
  { id: "cmp5", name: "Wayanad Workation Month", image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=70", placement: "Homepage Spotlight", region: "Kerala", window: "Aug 01 – Aug 31", budget: "₹40,000", impressions: "—", clicks: "—", live: false },
  { id: "cmp6", name: "Summer Farm Camps", image: "https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=70", placement: "Stays Top Banner", region: "Karnataka", window: "Ended Jun 30", budget: "₹25,000", impressions: "61.3k", clicks: "2.9k", live: false, ended: true },
];

export default function MarketingCampaignsPage() {
  const [region, setRegion] = useState<Region>("All regions");
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const toggleLive = (id: string) =>
    setCampaigns((prev) => prev.map((c) => (c.id === id && !c.ended ? { ...c, live: !c.live } : c)));

  const visible = campaigns.filter((c) => region === "All regions" || c.region === region);
  const liveCount = campaigns.filter((c) => c.live).length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Campaigns"
        subtitle="Region-targeted campaigns feeding the app's placements — pause or resume any time."
        action={{ label: "New Campaign", href: "/marketing/campaigns", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Live Now", value: String(liveCount), delta: "across 4 placements", icon: Megaphone },
          { label: "Impressions · July", value: "168k", delta: "+19% MoM", icon: Eye },
          { label: "Clicks · July", value: "8.0k", delta: "4.7% CTR", icon: MousePointerClick },
          { label: "Scheduled", value: "1", delta: "Wayanad · Aug 01", icon: CalendarDays },
        ]}
      />

      {/* Region filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {regionFilters.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              region === r
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Campaign rows */}
      <div className="space-y-4">
        {visible.map((c) => (
          <div key={c.id} className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src={c.image} alt={c.name} className="w-full md:w-36 h-24 rounded-xl object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <StatusPill tone={c.ended ? "muted" : c.live ? "sage" : "primary"}>
                  {c.ended ? "Ended" : c.live ? "Live" : "Paused / scheduled"}
                </StatusPill>
              </div>
              <p className="text-xs text-muted mt-1">
                {c.placement} · <span className="inline-flex items-center gap-0.5"><MapPin size={10} /> {c.region}</span> · {c.window}
              </p>
              <p className="text-[11px] text-subtle mt-1 tabular-nums">
                Budget {c.budget} · {c.impressions} impressions · {c.clicks} clicks
              </p>
            </div>
            {!c.ended && (
              <button
                onClick={() => toggleLive(c.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-colors shrink-0 ${
                  c.live
                    ? "border border-border text-muted hover:text-terracotta hover:border-terracotta/50"
                    : "bg-sage text-white hover:opacity-90"
                }`}
              >
                {c.live ? <Pause size={13} /> : <Play size={13} />}
                {c.live ? "Pause" : "Go live"}
              </button>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-muted text-center py-10 bg-surface border border-border rounded-2xl">
            No campaigns targeting {region} yet.
          </p>
        )}
      </div>
    </div>
  );
}
