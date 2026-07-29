"use client";

import { useState } from "react";
import {
  Percent,
  Tag,
  Wallet,
  Minus,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill, Toggle } from "@/app/components/DashboardUI";

// ============================================
// SUPER ADMIN — Commerce Rules
// Platform-wide pricing, commission floors and
// revenue control levers.
// ============================================

const COMMISSION_FLOOR = 10;

const initialCommissions = [
  { id: "c1", service: "Stays", rate: 15 },
  { id: "c2", service: "Events", rate: 12 },
  { id: "c3", service: "Rentals", rate: 12 },
  { id: "c4", service: "Food", rate: 10 },
  { id: "c5", service: "Experiences", rate: 10 },
  { id: "c6", service: "Hostels", rate: 10 },
];

const pricingRules = [
  { id: "pr1", label: "Weekend surge pricing", sub: "Auto +8-15% Fri-Sun on high-demand stays", on: true },
  { id: "pr2", label: "Last-minute vacancy discount", sub: "Auto -10% within 48 hours of check-in", on: true },
  { id: "pr3", label: "Long-stay discount tiers", sub: "7+ nights -10%, 21+ nights -18%", on: true },
  { id: "pr4", label: "Dynamic AI repricing", sub: "AI adjusts price within host-set bounds", on: false },
];

export default function SuperAdminCommercePage() {
  const [commissions, setCommissions] = useState(initialCommissions);
  const [rules, setRules] = useState(pricingRules);
  const [freeze, setFreeze] = useState(false);

  const changeRate = (id: string, delta: number) =>
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, rate: Math.max(COMMISSION_FLOOR, Math.min(25, c.rate + delta)) } : c))
    );

  const toggleRule = (id: string) => setRules((prev) => prev.map((r) => (r.id === id ? { ...r, on: !r.on } : r)));

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Commerce Rules"
        subtitle="Commission floors, pricing automation and platform-wide revenue levers."
      />

      <SectionCard title="Commission Rules" icon={Percent}>
        <p className="px-5 pt-4 text-xs text-muted">
          Minimum floor of <span className="text-foreground font-semibold">{COMMISSION_FLOOR}%</span> is enforced across every service.
        </p>
        <ul className="divide-y divide-surface-hover mt-2">
          {commissions.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-sm font-medium text-foreground">{c.service}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeRate(c.id, -1)}
                  disabled={c.rate <= COMMISSION_FLOOR}
                  aria-label={`Decrease ${c.service} commission`}
                  className="w-7 h-7 rounded-full border border-border text-muted hover:text-foreground hover:border-border-light disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Minus size={12} />
                </button>
                <span className="w-12 text-center text-sm font-semibold text-foreground tabular-nums">{c.rate}%</span>
                <button
                  onClick={() => changeRate(c.id, 1)}
                  aria-label={`Increase ${c.service} commission`}
                  className="w-7 h-7 rounded-full border border-border text-muted hover:text-foreground hover:border-border-light flex items-center justify-center transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Pricing Rules" icon={Tag}>
        <ul className="divide-y divide-surface-hover">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted mt-0.5">{r.sub}</p>
              </div>
              <button onClick={() => toggleRule(r.id)} aria-label={`Toggle ${r.label}`}>
                <Toggle on={r.on} />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Revenue Control" icon={Wallet}>
        <div className="px-5 py-4 grid sm:grid-cols-3 gap-4 text-xs mb-2">
          <div className="rounded-xl bg-background border border-border p-4">
            <p className="text-subtle">Platform-wide discount cap</p>
            <p className="text-foreground font-semibold mt-1">25% max</p>
          </div>
          <div className="rounded-xl bg-background border border-border p-4">
            <p className="text-subtle">Investor payout schedule</p>
            <p className="text-sage font-semibold mt-1">On track</p>
          </div>
          <div className="rounded-xl bg-background border border-border p-4">
            <p className="text-subtle">MTD platform GMV</p>
            <p className="text-foreground font-semibold mt-1">₹42.6L</p>
          </div>
        </div>
        <div className="mx-5 mb-5 flex items-center justify-between gap-4 rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-terracotta shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Emergency revenue freeze</p>
              <p className="text-xs text-muted mt-0.5">Pauses all outbound payouts platform-wide. Use only during an incident.</p>
            </div>
          </div>
          <button onClick={() => setFreeze((f) => !f)} aria-label="Toggle emergency freeze">
            <Toggle on={freeze} />
          </button>
        </div>
        {freeze && (
          <p className="mx-5 mb-5 -mt-3 text-xs text-terracotta flex items-center gap-1.5">
            <StatusPill tone="terracotta">Active</StatusPill> All payouts are currently frozen.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
