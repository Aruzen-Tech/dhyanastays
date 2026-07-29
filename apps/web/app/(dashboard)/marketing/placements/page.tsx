"use client";

import { useState } from "react";
import {
  Map,
  MapPin,
  Sparkles,
  Megaphone,
  Home,
  UtensilsCrossed,
  CalendarDays,
  FileText,
  Bell,
} from "lucide-react";
import { PageHeader, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// MARKETING — Placements & Regions
// What each app slot shows, region by region.
// Empty slots fall back to AI suggestions.
// ============================================

const regions = ["Tamil Nadu", "Pondicherry", "Kerala", "Karnataka", "Goa"] as const;
type Region = (typeof regions)[number];

interface SlotRow {
  slot: string;
  icon: typeof Home;
  content: string;
  status: "Live" | "Scheduled" | "AI fallback";
}

const feeds: Record<Region, SlotRow[]> = {
  "Tamil Nadu": [
    { slot: "Homepage Spotlight", icon: Home, content: "Monsoon Wellness Week (national)", status: "Live" },
    { slot: "Stays Top Banner", icon: Home, content: "Weekend Escapes · 15% off", status: "Live" },
    { slot: "Food Hub Tile", icon: UtensilsCrossed, content: "Chettinad Feast reel", status: "Live" },
    { slot: "Events Banner", icon: CalendarDays, content: "Full Moon Folk Festival", status: "Live" },
    { slot: "Blog Feature", icon: FileText, content: "Tiny House Philosophy", status: "Scheduled" },
  ],
  Pondicherry: [
    { slot: "Homepage Spotlight", icon: Home, content: "Monsoon Wellness Week (national)", status: "Live" },
    { slot: "Stays Top Banner", icon: Home, content: "— empty —", status: "AI fallback" },
    { slot: "Food Hub Tile", icon: UtensilsCrossed, content: "Chettinad Feast reel", status: "Live" },
    { slot: "Events Banner", icon: CalendarDays, content: "— empty —", status: "AI fallback" },
    { slot: "Blog Feature", icon: FileText, content: "Auroville journal series", status: "Live" },
  ],
  Kerala: [
    { slot: "Homepage Spotlight", icon: Home, content: "Wayanad Workation (from Aug 01)", status: "Scheduled" },
    { slot: "Stays Top Banner", icon: Home, content: "— empty —", status: "AI fallback" },
    { slot: "Food Hub Tile", icon: UtensilsCrossed, content: "— empty —", status: "AI fallback" },
    { slot: "Events Banner", icon: CalendarDays, content: "— empty —", status: "AI fallback" },
    { slot: "Blog Feature", icon: FileText, content: "Monsoon Trails of the Western Ghats", status: "Live" },
  ],
  Karnataka: [
    { slot: "Homepage Spotlight", icon: Home, content: "Monsoon Wellness Week (national)", status: "Live" },
    { slot: "Stays Top Banner", icon: Home, content: "— empty —", status: "AI fallback" },
    { slot: "Food Hub Tile", icon: UtensilsCrossed, content: "— empty —", status: "AI fallback" },
    { slot: "Events Banner", icon: CalendarDays, content: "Coorg coffee trail teaser", status: "Live" },
    { slot: "Blog Feature", icon: FileText, content: "— empty —", status: "AI fallback" },
  ],
  Goa: [
    { slot: "Homepage Spotlight", icon: Home, content: "Monsoon Wellness Week (national)", status: "Live" },
    { slot: "Stays Top Banner", icon: Home, content: "— empty —", status: "AI fallback" },
    { slot: "Food Hub Tile", icon: UtensilsCrossed, content: "— empty —", status: "AI fallback" },
    { slot: "Events Banner", icon: CalendarDays, content: "— empty —", status: "AI fallback" },
    { slot: "Blog Feature", icon: FileText, content: "— empty —", status: "AI fallback" },
  ],
};

export default function PlacementsRegionsPage() {
  const [region, setRegion] = useState<Region>("Tamil Nadu");
  const rows = feeds[region];
  const liveCount = rows.filter((r) => r.status === "Live").length;
  const fallbackCount = rows.filter((r) => r.status === "AI fallback").length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Placements & Regions"
        subtitle="Every ad slot in the app, region by region — feed a slot or let AI suggestions hold it."
        action={{ label: "Feed a slot", href: "/marketing/content", icon: Megaphone }}
      />

      <StatGrid
        stats={[
          { label: "App Placements", value: "5", delta: "per region", icon: Map },
          { label: "Regions", value: "5", delta: "independent feeds", icon: MapPin },
          { label: "Slots Live · " + region, value: String(liveCount), delta: "manager-fed" },
          { label: "On AI Fallback · " + region, value: String(fallbackCount), delta: "auto suggestions", icon: Sparkles },
        ]}
      />

      {/* Region selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
              region === r
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            <MapPin size={12} />
            {r}
          </button>
        ))}
      </div>

      {/* Slot table for region */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-hover flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Feed for {region}</p>
          <span className="text-[10px] text-subtle">changes apply instantly</span>
        </div>
        <ul className="divide-y divide-surface-hover">
          {rows.map((r) => (
            <li key={r.slot} className="flex items-center gap-4 px-5 py-4">
              <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <r.icon size={15} />
              </span>
              <div className="w-44 shrink-0">
                <p className="text-sm font-medium text-foreground">{r.slot}</p>
              </div>
              <p className={`flex-1 text-xs truncate ${r.status === "AI fallback" ? "text-subtle italic" : "text-muted"}`}>
                {r.status === "AI fallback" ? "AI suggestions shown until you feed this slot" : r.content}
              </p>
              <StatusPill tone={r.status === "Live" ? "sage" : r.status === "Scheduled" ? "primary" : "muted"}>
                {r.status}
              </StatusPill>
              <button className="text-xs text-primary hover:underline shrink-0">
                {r.status === "AI fallback" ? "Feed slot" : "Swap"}
              </button>
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover flex items-center gap-1.5">
          <Bell size={11} />
          Region feeds are independent — a Kerala guest and a Chennai guest can see completely different campaigns in the same slot.
        </p>
      </div>
    </div>
  );
}
