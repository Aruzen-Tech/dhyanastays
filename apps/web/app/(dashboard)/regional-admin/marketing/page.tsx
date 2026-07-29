"use client";

import { useState } from "react";
import {
  Megaphone,
  Image as ImageIcon,
  FileText,
  Bell,
  Plus,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill, Toggle } from "@/app/components/DashboardUI";

// ============================================
// REGIONAL ADMIN — Regional Marketing
// Campaigns, offers, banners, blogs and
// notifications scoped to this region only.
// ============================================

type ItemType = "Campaign" | "Banner" | "Blog" | "Notification";

interface MarketingItem {
  id: string;
  type: ItemType;
  title: string;
  region: string;
  live: boolean;
}

const typeIcon: Record<ItemType, typeof Megaphone> = {
  Campaign: Megaphone,
  Banner: ImageIcon,
  Blog: FileText,
  Notification: Bell,
};

const initialItems: MarketingItem[] = [
  { id: "m1", type: "Campaign", title: "Monsoon Wellness Week — TN & Pondi", region: "Regional", live: true },
  { id: "m2", type: "Campaign", title: "Weekend Escapes 15%", region: "Regional", live: true },
  { id: "m3", type: "Banner", title: "Stays Top Banner — Auroville feature", region: "Auroville", live: true },
  { id: "m4", type: "Blog", title: "Auroville Heritage Trail", region: "Regional", live: false },
  { id: "m5", type: "Notification", title: "New host onboarding push — Pondicherry", region: "Pondicherry", live: false },
];

export default function RegionalAdminMarketingPage() {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("Campaign");

  const toggleLive = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, live: !i.live } : i)));

  const create = () => {
    if (!title.trim()) return;
    setItems((prev) => [{ id: `m${Date.now()}`, type, title: title.trim(), region: "Regional", live: false }, ...prev]);
    setTitle("");
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Regional Marketing"
        subtitle="Campaigns, offers, banners, blogs and notifications for Tamil Nadu & Pondicherry — publishes instantly, no national review needed."
      />

      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Quick create</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ItemType)}
            className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {(["Campaign", "Banner", "Blog", "Notification"] as ItemType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Long weekend push — Pondicherry stays"
            className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
          />
          <button
            onClick={create}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors whitespace-nowrap"
          >
            <Plus size={15} /> Add draft
          </button>
        </div>
      </div>

      <SectionCard title="Regional Feed" icon={Megaphone}>
        <ul className="divide-y divide-surface-hover">
          {items.map((i) => {
            const Icon = typeIcon[i.type];
            return (
              <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.title}</p>
                    <p className="text-xs text-subtle">{i.type} · {i.region}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusPill tone={i.live ? "sage" : "muted"}>{i.live ? "Live" : "Draft"}</StatusPill>
                  <button onClick={() => toggleLive(i.id)} aria-label={`Toggle ${i.title}`}>
                    <Toggle on={i.live} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover">
          Regional items publish instantly. National Homepage Spotlight placements still need Marketing HQ sign-off.
        </p>
      </SectionCard>
    </div>
  );
}
