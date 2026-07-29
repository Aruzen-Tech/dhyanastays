"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Lock,
  ShieldCheck,
  KeyRound,
  TrendingUp,
  Percent,
  Wallet,
  Zap,
  ArrowRight,
  MapPin,
  Receipt,
  BarChart3,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// FINANCE DASHBOARD — Super Admin access only
// Overall + regional revenue, commissions,
// payments tracking, Razorpay auto-payouts
// ============================================

const regions = [
  { name: "Tamil Nadu", gmv: "₹18.2L", pct: 43 },
  { name: "Pondicherry", gmv: "₹9.4L", pct: 22 },
  { name: "Kerala", gmv: "₹8.1L", pct: 19 },
  { name: "Karnataka", gmv: "₹4.7L", pct: 11 },
  { name: "Goa", gmv: "₹2.2L", pct: 5 },
];

const recentPayments = [
  { id: "pay_NkX82jQ1", what: "Stay booking · Canopy Tiny House", amount: "₹18,000", status: "Captured", tone: "sage" as const },
  { id: "pay_NkX79aB4", what: "Food pre-book · Chettinad Thali × 6", amount: "₹2,100", status: "Captured", tone: "sage" as const },
  { id: "pay_NkX41rT8", what: "Event advance · Heritage wedding", amount: "₹1,80,000", status: "Captured", tone: "sage" as const },
  { id: "rfnd_Nh227e", what: "Refund · Stone Valley cancellation", amount: "-₹13,500", status: "Refunded", tone: "muted" as const },
];

export default function FinanceDashboardPage() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-8 text-center">
          <span className="mx-auto w-16 h-16 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center">
            <Lock size={26} />
          </span>
          <h1 className="heading-display text-2xl text-foreground mt-5">Finance is locked</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Revenue, commissions and payment records are visible to the
            <span className="text-foreground font-medium"> Super Admin role only</span>.
            Every access is logged to the audit trail.
          </p>
          <button
            onClick={() => setUnlocked(true)}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
          >
            <KeyRound size={16} /> Authenticate as Super Admin
          </button>
          <p className="text-[11px] text-subtle mt-3">2-factor + hardware key required in production</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Finance Dashboard"
          subtitle="Platform-wide money view — every rupee in, every commission, every payout."
        />
        <StatusPill tone="sage">
          <ShieldCheck size={11} /> Super Admin verified · access logged
        </StatusPill>
      </div>

      <StatGrid
        stats={[
          { label: "GMV · July", value: "₹42.6L", delta: "+15% MoM", icon: TrendingUp },
          { label: "Platform Commission", value: "₹6.4L", delta: "15% blended · 10% floor", icon: Percent },
          { label: "Paid to Hosts & Partners", value: "₹36.2L", delta: "auto via RazorpayX", icon: Wallet },
          { label: "Payments Tracked", value: "2,318", delta: "100% reconciled", icon: Receipt },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Region-wise revenue */}
        <SectionCard title="Region-wise Revenue · July" icon={MapPin} className="lg:col-span-2" action={{ label: "Full breakdown", href: "/finance/revenue" }}>
          <div className="px-5 py-5 space-y-4">
            {regions.map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted">{r.name}</span>
                  <span className="text-foreground font-semibold tabular-nums">{r.gmv}</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-hover overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-sage to-primary" style={{ width: `${r.pct * 2.2}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Razorpay status */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-sage/15 to-surface border border-sage/25 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap size={15} className="text-sage" /> RazorpayX Payouts
              </p>
              <StatusPill tone="sage">Connected</StatusPill>
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Automatic payouts are on — hosts get their cut T+3 after checkout,
              food &amp; rental partners every Friday. No manual transfers.
            </p>
            <Link href="/finance/payouts" className="text-xs text-primary hover:underline mt-3 inline-flex items-center gap-1">
              Payout automation <ArrowRight size={12} />
            </Link>
          </div>

          <SectionCard title="Latest Payments" icon={BarChart3} action={{ label: "Full ledger", href: "/finance/payments" }}>
            <ul className="divide-y divide-surface-hover">
              {recentPayments.slice(0, 3).map((p) => (
                <li key={p.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-foreground truncate">{p.what}</p>
                    <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">{p.amount}</span>
                  </div>
                  <p className="text-[10px] text-subtle font-mono mt-0.5">{p.id}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
