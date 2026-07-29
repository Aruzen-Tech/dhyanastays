"use client";

import { useState } from "react";
import {
  Server,
  Flag,
  Building,
  Megaphone,
  Settings2,
  X,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill, Toggle } from "@/app/components/DashboardUI";
import { dashboardRoles } from "@/lib/dashboards";

// ============================================
// SUPER ADMIN — Platform Control
// Every dashboard module, feature flag, listing
// moderation queue and platform-wide ad slot —
// all live-toggleable from one root screen.
// ============================================

const initialFlags = [
  { id: "f1", name: "ai-concierge-v2", desc: "Unlimited AI concierge for Forest+ members", on: true },
  { id: "f2", name: "membership-founders-circle", desc: "Invitation-only tier visible on membership page", on: true },
  { id: "f3", name: "razorpayx-auto-refunds", desc: "Auto-process refunds under ₹5,000", on: false },
  { id: "f4", name: "regional-admin-dashboard", desc: "Regional Admin role & routes", on: true },
];

const listingQueue = [
  { id: "l1", name: "Palmyra Farm Cottage", region: "Auroville", status: "Live" },
  { id: "l2", name: "Whistling Pines Homestead", region: "Coorg", status: "Live" },
  { id: "l3", name: "Old Mill Guesthouse", region: "Wayanad", status: "Flagged" },
];

const adSlots = [
  { id: "ad1", name: "Homepage Spotlight", advertiser: "Nila Wellness Retreat", on: true },
  { id: "ad2", name: "Stays Top Banner", advertiser: "Dhyana Curated Stays", on: true },
  { id: "ad3", name: "Food Hub Tile", advertiser: "Meena's Kitchen", on: false },
];

export default function SuperAdminPlatformPage() {
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState(initialFlags);
  const [listings, setListings] = useState(listingQueue);
  const [ads, setAds] = useState(adSlots);

  const isModuleOn = (slug: string) => modules[slug] ?? true;
  const toggleModule = (slug: string) => setModules((p) => ({ ...p, [slug]: !isModuleOn(slug) }));
  const toggleFlag = (id: string) => setFlags((p) => p.map((f) => (f.id === id ? { ...f, on: !f.on } : f)));
  const toggleAd = (id: string) => setAds((p) => p.map((a) => (a.id === id ? { ...a, on: !a.on } : a)));
  const delist = (id: string) => setListings((p) => p.filter((l) => l.id !== id));

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Platform Control"
        subtitle="Every dashboard module, feature flag, listing and ad slot — live across the whole platform."
      />

      <SectionCard title="All Modules" icon={Server}>
        <p className="px-5 pt-4 text-xs text-muted">
          {dashboardRoles.length} dashboard roles registered. Disabling a module hides it platform-wide.
        </p>
        <ul className="divide-y divide-surface-hover mt-2">
          {dashboardRoles.map((r) => (
            <li key={r.slug} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <r.icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-subtle">{r.group}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusPill tone={isModuleOn(r.slug) ? "sage" : "terracotta"}>
                  {isModuleOn(r.slug) ? "Enabled" : "Disabled"}
                </StatusPill>
                <button onClick={() => toggleModule(r.slug)} aria-label={`Toggle ${r.title}`}>
                  <Toggle on={isModuleOn(r.slug)} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Feature Flags" icon={Flag}>
          <ul className="divide-y divide-surface-hover">
            {flags.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-subtle mt-0.5">{f.desc}</p>
                </div>
                <button onClick={() => toggleFlag(f.id)} aria-label={`Toggle ${f.name}`} className="shrink-0">
                  <Toggle on={f.on} />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Advertisements" icon={Megaphone}>
          <ul className="divide-y divide-surface-hover">
            {ads.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-subtle">{a.advertiser}</p>
                </div>
                <button onClick={() => toggleAd(a.id)} aria-label={`Toggle ${a.name}`} className="shrink-0">
                  <Toggle on={a.on} />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Listing / Delisting" icon={Building}>
        <ul className="divide-y divide-surface-hover">
          {listings.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{l.name}</p>
                <p className="text-xs text-subtle">{l.region}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill tone={l.status === "Flagged" ? "terracotta" : "sage"}>{l.status}</StatusPill>
                <button
                  onClick={() => delist(l.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full text-muted hover:text-terracotta hover:border-terracotta/40 transition-colors"
                >
                  <X size={12} /> Delist
                </button>
              </div>
            </li>
          ))}
          {listings.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-subtle">Queue is clear.</li>
          )}
        </ul>
      </SectionCard>

      <SectionCard title="Platform Configuration" icon={Settings2}>
        <div className="px-5 py-4 grid sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-background border border-border p-4">
            <p className="text-subtle">Default currency</p>
            <p className="text-foreground font-semibold mt-1">INR (₹)</p>
          </div>
          <div className="rounded-xl bg-background border border-border p-4">
            <p className="text-subtle">Default region on signup</p>
            <p className="text-foreground font-semibold mt-1">Tamil Nadu</p>
          </div>
          <div className="rounded-xl bg-background border border-border p-4">
            <p className="text-subtle">Maintenance mode</p>
            <p className="text-sage font-semibold mt-1">Off</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
