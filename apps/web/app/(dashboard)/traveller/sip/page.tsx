"use client";

import { useState } from "react";
import {
  PiggyBank,
  Target,
  CalendarClock,
  PauseCircle,
  Plus,
  Check,
  Sparkles,
  TrendingUp,
  Landmark,
  Mountain,
  Umbrella,
  ArrowRight,
  Gift,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// TRAVEL SIP — systematic savings for trips
// (Traveller · Budget Planning · Module 2)
// ============================================

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const activeSips = [
  {
    id: "sip1",
    goal: "Spiti Valley Expedition",
    icon: Mountain,
    target: 60000,
    saved: 27000,
    monthly: 3000,
    nextDebit: "Aug 05",
    endsBy: "May 2027",
    source: "UPI · ananya@okhdfcbank",
    bonus: "5% travel credit on completion",
  },
  {
    id: "sip2",
    goal: "Goa New Year Villa",
    icon: Umbrella,
    target: 18000,
    saved: 7500,
    monthly: 1500,
    nextDebit: "Aug 05",
    endsBy: "Dec 2026",
    source: "HDFC Credit Card •••• 4821",
    bonus: "Milestone coupon at 50%",
  },
];

const history = [
  { label: "July contribution · both SIPs", amount: "+₹4,500", date: "Jul 05", status: "Paid", tone: "sage" as const },
  { label: "June contribution · both SIPs", amount: "+₹4,500", date: "Jun 05", status: "Paid", tone: "sage" as const },
  { label: "50% milestone bonus · Spiti Valley", amount: "+₹650", date: "Jun 05", status: "Bonus", tone: "primary" as const },
  { label: "May contribution · both SIPs", amount: "+₹4,500", date: "May 05", status: "Paid", tone: "sage" as const },
  { label: "August contribution · both SIPs", amount: "₹4,500", date: "Aug 05", status: "Scheduled", tone: "muted" as const },
];

const perks = [
  "Auto-debit on a date you choose — pause or skip any month, no penalty",
  "5% Dhyana travel credit added when a SIP completes",
  "Spend your fund on stays, food, events or rentals — one balance",
  "Milestone coupons at 50% and 100% of your goal",
  "Group SIP: split a goal with friends and track everyone's share",
];

export default function TravellerSipPage() {
  // Interactive calculator
  const [monthly, setMonthly] = useState(2500);
  const [months, setMonths] = useState(12);
  const corpus = monthly * months;
  const bonus = Math.round(corpus * 0.05);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Travel SIP"
        subtitle="Save a little every month, travel without the lump-sum pinch — your monthly travel fund with bonus credit."
        action={{ label: "Start New SIP", href: "#calculator", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Total Saved", value: "₹34,500", delta: "across 2 goals", icon: PiggyBank },
          { label: "Monthly Commitment", value: "₹4,500", delta: "next debit Aug 05", icon: CalendarClock },
          { label: "Bonus Earned", value: "₹1,150", delta: "credits + milestones", icon: Gift },
          { label: "Goal Progress", value: "44%", delta: "on track", icon: TrendingUp },
        ]}
      />

      {/* Active SIPs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {activeSips.map((s) => {
          const pct = Math.round((s.saved / s.target) * 100);
          return (
            <div key={s.id} className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <s.icon size={20} />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{s.goal}</h2>
                    <p className="text-xs text-muted mt-0.5">
                      {inr(s.monthly)}/month · completes {s.endsBy}
                    </p>
                  </div>
                </div>
                <StatusPill tone="sage">Active</StatusPill>
              </div>

              {/* Progress */}
              <div className="mt-5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">
                    Saved <span className="text-foreground font-semibold">{inr(s.saved)}</span> of {inr(s.target)}
                  </span>
                  <span className="text-primary font-semibold tabular-nums">{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
                <div className="rounded-xl bg-background border border-border px-3.5 py-2.5">
                  <p className="text-subtle">Next auto-debit</p>
                  <p className="text-foreground font-medium mt-0.5">{s.nextDebit} · {inr(s.monthly)}</p>
                </div>
                <div className="rounded-xl bg-background border border-border px-3.5 py-2.5">
                  <p className="text-subtle">Debit source</p>
                  <p className="text-foreground font-medium mt-0.5 truncate">{s.source}</p>
                </div>
              </div>

              <p className="text-[11px] text-sage mt-3 flex items-center gap-1.5">
                <Sparkles size={11} /> {s.bonus}
              </p>

              <div className="flex gap-2 mt-4 pt-4 border-t border-surface-hover">
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors">
                  <Plus size={13} /> Top up
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border rounded-full text-muted hover:text-foreground hover:border-border-light transition-colors">
                  <PauseCircle size={13} /> Pause
                </button>
                <button className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
                  Plan this trip <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calculator */}
        <div
          id="calculator"
          className="lg:col-span-2 scroll-mt-24 bg-gradient-to-br from-primary/10 via-surface to-surface border border-primary/25 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Start a new Travel SIP</h2>
          </div>
          <p className="text-xs text-muted mb-6">
            Drag the sliders — see what your monthly saving grows into.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted">Monthly amount</span>
                <span className="text-foreground font-semibold tabular-nums">{inr(monthly)}</span>
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={500}
                value={monthly}
                onChange={(e) => setMonthly(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Monthly amount"
              />
              <div className="flex justify-between text-[10px] text-subtle mt-1">
                <span>₹500</span>
                <span>₹10,000</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted">Duration</span>
                <span className="text-foreground font-semibold tabular-nums">{months} months</span>
              </div>
              <input
                type="range"
                min={3}
                max={36}
                step={1}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Duration in months"
              />
              <div className="flex justify-between text-[10px] text-subtle mt-1">
                <span>3 mo</span>
                <span>36 mo</span>
              </div>
            </div>
          </div>

          {/* Projection */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl bg-background border border-border p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-subtle">You save</p>
              <p className="text-lg font-bold text-foreground mt-1 tabular-nums">{inr(corpus)}</p>
            </div>
            <div className="rounded-xl bg-background border border-sage/40 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-sage">+5% bonus</p>
              <p className="text-lg font-bold text-sage mt-1 tabular-nums">{inr(bonus)}</p>
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/40 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-primary">Travel fund</p>
              <p className="text-lg font-bold text-foreground mt-1 tabular-nums">{inr(corpus + bonus)}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted mt-3">
            {inr(corpus + bonus)} ≈ {Math.max(1, Math.floor((corpus + bonus) / 4500))} nights at a curated tiny house, or{" "}
            {Math.max(1, Math.floor((corpus + bonus) / 8500))} nights at a wellness retreat.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <input
              placeholder="Name your goal — e.g. “Kerala monsoon week”"
              className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
            />
            <button className="px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all whitespace-nowrap">
              Start SIP · {inr(monthly)}/mo
            </button>
          </div>
          <p className="text-[10px] text-subtle mt-2 flex items-center gap-1">
            <Landmark size={10} /> Auto-debit via UPI mandate · pause anytime · fully refundable
          </p>
        </div>

        {/* Perks */}
        <SectionCard title="How Travel SIP works" icon={Sparkles}>
          <ul className="px-5 py-4 space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex gap-2.5 text-xs text-muted leading-relaxed">
                <Check size={13} className="text-sage shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Contribution history */}
      <SectionCard title="Monthly Travel Fund · History" icon={CalendarClock}>
        <ul className="divide-y divide-surface-hover">
          {history.map((h) => (
            <li key={h.label + h.date} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{h.label}</p>
                <p className="text-[11px] text-subtle">{h.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold tabular-nums ${h.status === "Scheduled" ? "text-muted" : "text-sage"}`}>
                  {h.amount}
                </span>
                <StatusPill tone={h.tone}>{h.status}</StatusPill>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
