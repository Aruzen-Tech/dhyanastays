"use client";

import { useState } from "react";
import {
  Receipt,
  ShieldCheck,
  Download,
  CreditCard,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// FINANCE — Payments Ledger (Super Admin only)
// Every payment on the platform, fully trackable:
// gross → commission → host cut, with gateway refs.
// ============================================

const typeFilters = ["All", "Stays", "Food", "Events", "Rentals", "Refunds"] as const;
type PType = (typeof typeFilters)[number];

interface Payment {
  id: string;
  type: Exclude<PType, "All" | "Refunds"> | "Refund";
  what: string;
  payer: string;
  method: string;
  gross: string;
  commission: string;
  hostCut: string;
  status: "Captured" | "Settled" | "Refunded" | "Pending";
}

const payments: Payment[] = [
  { id: "pay_NkX82jQ1Zt", type: "Stays", what: "Canopy Tiny House · 4 nights", payer: "Priya Sharma", method: "UPI", gross: "₹18,000", commission: "₹2,700", hostCut: "₹15,300", status: "Captured" },
  { id: "pay_NkX79aB4Lm", type: "Food", what: "Chettinad Thali × 6 · pre-book", payer: "Vivek R.", method: "Card", gross: "₹2,100", commission: "₹210", hostCut: "₹1,890", status: "Captured" },
  { id: "pay_NkX41rT8Qs", type: "Events", what: "Heritage wedding · advance", payer: "Ishita & Dev", method: "NetBanking", gross: "₹1,80,000", commission: "₹21,600", hostCut: "₹1,58,400", status: "Settled" },
  { id: "pay_NkX37pW2Ax", type: "Rentals", what: "Mahindra Thar · 3 days", payer: "Vivek & friends", method: "UPI", gross: "₹9,600", commission: "₹1,152", hostCut: "₹8,448", status: "Settled" },
  { id: "rfnd_Nh227eKp0", type: "Refund", what: "Stone Valley cancellation", payer: "→ Priya Sharma", method: "To source", gross: "-₹13,500", commission: "—", hostCut: "—", status: "Refunded" },
  { id: "pay_NkX18uV5Dn", type: "Stays", what: "Nila Wellness · 7 nights", payer: "Anita Desai", method: "Card EMI", gross: "₹59,500", commission: "₹8,925", hostCut: "₹50,575", status: "Pending" },
];

const tone = (s: Payment["status"]) =>
  s === "Captured" ? ("sage" as const) : s === "Settled" ? ("primary" as const) : s === "Pending" ? ("terracotta" as const) : ("muted" as const);

export default function PaymentsLedgerPage() {
  const [filter, setFilter] = useState<PType>("All");
  const visible = payments.filter(
    (p) => filter === "All" || (filter === "Refunds" ? p.type === "Refund" : p.type === filter)
  );

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Payments Ledger"
          subtitle="Every payment on the site — gross, commission and host cut, traceable to the gateway reference."
          action={{ label: "Export CSV", href: "/finance/payments", icon: Download }}
        />
        <StatusPill tone="sage">
          <ShieldCheck size={11} /> Super Admin only
        </StatusPill>
      </div>

      <StatGrid
        stats={[
          { label: "Payments · July", value: "2,318", delta: "100% reconciled", icon: Receipt },
          { label: "Captured Today", value: "₹1.84L", delta: "31 transactions", icon: CreditCard },
          { label: "Refunds · July", value: "₹0.9L", delta: "2.1% of GMV", icon: RefreshCw },
          { label: "Pending Settlement", value: "₹2.6L", delta: "T+2 from gateway" },
        ]}
      />

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            placeholder="Search by payment ID, guest, booking…"
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-full text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-3 py-3 font-semibold">Payer</th>
                <th className="px-3 py-3 font-semibold">Method</th>
                <th className="px-3 py-3 font-semibold">Gross</th>
                <th className="px-3 py-3 font-semibold">Commission</th>
                <th className="px-3 py-3 font-semibold">Host Cut</th>
                <th className="px-5 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {visible.map((p) => (
                <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-foreground font-medium">{p.what}</p>
                    <p className="text-[10px] text-subtle font-mono mt-0.5">{p.id}</p>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{p.payer}</td>
                  <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{p.method}</td>
                  <td className="px-3 py-3.5 text-sm text-foreground font-medium tabular-nums whitespace-nowrap">{p.gross}</td>
                  <td className="px-3 py-3.5 text-sm text-sage font-medium tabular-nums whitespace-nowrap">{p.commission}</td>
                  <td className="px-3 py-3.5 text-sm text-muted tabular-nums whitespace-nowrap">{p.hostCut}</td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusPill tone={tone(p.status)}>{p.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover">
          Ledger reconciles nightly against Razorpay settlement files — every payment carries its gateway reference, split and payout link.
        </p>
      </div>
    </div>
  );
}
