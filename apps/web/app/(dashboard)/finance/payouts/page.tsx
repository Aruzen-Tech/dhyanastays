"use client";

import { useState } from "react";
import {
  Wallet,
  Zap,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  Server,
  Landmark,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill, Toggle } from "@/app/components/DashboardUI";

// ============================================
// FINANCE — Payouts & Automation (Super Admin)
// Host revenue cuts, auto-paid via RazorpayX
// ============================================

const split = [
  { label: "July GMV (all services)", value: "₹42.6L", cls: "bg-primary" },
  { label: "Platform commission (10–15%)", value: "₹6.4L", cls: "bg-sage" },
  { label: "Paid out to hosts & partners", value: "₹36.2L", cls: "bg-primary-hover" },
];

const schedule = [
  { who: "Stay hosts", when: "T+3 after guest checkout", note: "per booking" },
  { who: "Food partners", when: "Every Friday", note: "weekly batch" },
  { who: "Rental providers", when: "Every Friday", note: "weekly batch" },
  { who: "Event planners", when: "3 days after event", note: "per event" },
  { who: "Investors", when: "1st of month", note: "distribution run" },
];

const batches = [
  { id: "pout_Nk8821Aa", who: "Vikram Patel · stay host", amount: "₹15,300", utr: "UTR 2318744021", status: "Processed", tone: "sage" as const, when: "Today 6:00 AM" },
  { id: "pout_Nk8820Zx", who: "Meena's Kitchen · food partner", amount: "₹18,420", utr: "UTR 2318743988", status: "Processed", tone: "sage" as const, when: "Fri batch" },
  { id: "pout_Nk8819Qw", who: "Auro Wheels · rental provider", amount: "₹11,180", utr: "UTR 2318743911", status: "Processed", tone: "sage" as const, when: "Fri batch" },
  { id: "pout_Nk8823Bv", who: "Sana Kapoor Events · planner", amount: "₹1,58,400", utr: "queued", status: "Queued", tone: "primary" as const, when: "Aug 05 · post-event" },
];

const webhooks = [
  { time: "06:00:14", event: "payout.processed", detail: "pout_Nk8821Aa → ICICI ****8834 · ₹15,300" },
  { time: "06:00:09", event: "payout.initiated", detail: "batch of 14 payouts · ₹4.2L total" },
  { time: "05:59:58", event: "fund_account.validated", detail: "new partner account · Canara ****3308" },
];

export default function PayoutsAutomationPage() {
  const [auto, setAuto] = useState(true);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Payouts & Automation"
          subtitle="Host and partner revenue cuts, paid automatically through RazorpayX — no manual transfers."
        />
        <StatusPill tone="sage">
          <ShieldCheck size={11} /> Super Admin only
        </StatusPill>
      </div>

      <StatGrid
        stats={[
          { label: "Paid Out · July", value: "₹36.2L", delta: "412 payouts", icon: Wallet },
          { label: "Queued", value: "₹2.1L", delta: "next batch Fri 6 AM", icon: Clock },
          { label: "Failed / Retried", value: "2", delta: "auto-retried, both cleared", icon: CheckCircle2 },
          { label: "Automation", value: auto ? "On" : "Off", delta: "RazorpayX", icon: Zap },
        ]}
      />

      {/* Money split */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <p className="text-sm font-semibold text-foreground mb-4">Where July&apos;s money went</p>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {split.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3 flex-1">
              <div className="flex-1 rounded-xl border border-border bg-background p-4">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.cls} mb-2`} />
                <p className="text-lg font-bold text-foreground tabular-nums">{s.value}</p>
                <p className="text-[11px] text-muted mt-0.5">{s.label}</p>
              </div>
              {i < split.length - 1 && <ArrowRight size={16} className="text-subtle shrink-0 hidden md:block" />}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-subtle mt-3">
          The platform keeps its commission (minimum 10% on every service) — the rest flows out automatically on schedule.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Automation panel */}
        <div className="bg-gradient-to-br from-sage/15 to-surface border border-sage/25 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap size={15} className="text-sage" /> RazorpayX
            </p>
            <StatusPill tone="sage">Connected</StatusPill>
          </div>
          <div className="flex items-center justify-between mt-5">
            <div>
              <p className="text-sm font-medium text-foreground">Automatic payouts</p>
              <p className="text-[11px] text-muted mt-0.5">Turn off to hold all outgoing transfers</p>
            </div>
            <button onClick={() => setAuto(!auto)} aria-label="Toggle automatic payouts">
              <Toggle on={auto} />
            </button>
          </div>
          {!auto && (
            <p className="text-[11px] text-terracotta bg-terracotta/10 border border-terracotta/30 rounded-lg px-3 py-2 mt-3 animate-fade-in">
              Payouts on hold — queued transfers will wait until automation is back on.
            </p>
          )}
          <div className="mt-5 pt-4 border-t border-sage/20 space-y-2 text-[11px] text-muted">
            <p className="flex justify-between"><span>Payout balance</span><span className="text-foreground font-semibold tabular-nums">₹4.8L</span></p>
            <p className="flex justify-between"><span>Next batch</span><span className="text-foreground font-semibold">Fri 6:00 AM</span></p>
            <p className="flex justify-between"><span>Account</span><span className="text-foreground font-semibold">RazorpayX ····7741</span></p>
          </div>
        </div>

        {/* Schedule */}
        <SectionCard title="Auto-payout Schedule" icon={Clock} className="lg:col-span-2">
          <ul className="divide-y divide-surface-hover">
            {schedule.map((s) => (
              <li key={s.who} className="flex items-center gap-4 px-5 py-3.5">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Landmark size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.who}</p>
                  <p className="text-xs text-muted">{s.when}</p>
                </div>
                <span className="text-[11px] text-subtle">{s.note}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Recent payouts */}
      <SectionCard title="Recent Payouts" icon={Wallet}>
        <ul className="divide-y divide-surface-hover">
          {batches.map((b) => (
            <li key={b.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">{b.who}</p>
                <p className="text-[10px] text-subtle font-mono mt-0.5">{b.id} · {b.utr}</p>
              </div>
              <span className="text-[11px] text-subtle shrink-0">{b.when}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{b.amount}</span>
              <StatusPill tone={b.tone}>{b.status}</StatusPill>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Webhook log */}
      <SectionCard title="Gateway Event Log" icon={Server}>
        <ul className="divide-y divide-surface-hover">
          {webhooks.map((w) => (
            <li key={w.time} className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-[10px] text-subtle tabular-nums w-16 shrink-0">{w.time}</span>
              <span className="text-[10px] font-mono text-sage bg-sage/10 px-2 py-0.5 rounded shrink-0">{w.event}</span>
              <p className="text-xs text-muted truncate">{w.detail}</p>
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover">
          Live webhook stream from RazorpayX — every payout event is stored against its ledger entry.
        </p>
      </SectionCard>
    </div>
  );
}
