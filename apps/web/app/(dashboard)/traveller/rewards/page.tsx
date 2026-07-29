import {
  Gift,
  Copy,
  Ticket,
  Users,
  Share2,
  ArrowUpRight,
  Award,
  Flame,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

const coupons = [
  { code: "MONSOON20", desc: "20% off wellness retreats", expiry: "Valid till Aug 31", tone: "sage" as const },
  { code: "WEEKEND500", desc: "₹500 off weekend stays over ₹5,000", expiry: "Valid till Jul 31", tone: "primary" as const },
  { code: "FOODIE15", desc: "15% off curated food pre-bookings", expiry: "Valid till Sep 15", tone: "sage" as const },
];

const cashback = [
  { label: "Stone Valley Farm Stay · 3 nights", amount: "+₹420", date: "Jul 02" },
  { label: "Bike rental · Auroville", amount: "+₹45", date: "Jun 28" },
  { label: "Referral bonus · Priya joined", amount: "+₹500", date: "Jun 20" },
  { label: "Pottery workshop booking", amount: "+₹85", date: "Jun 14" },
];

export default function TravellerRewardsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Rewards & Coupons"
        subtitle="Points, membership perks, cashback and referral earnings — all in one place."
      />

      {/* Points hero */}
      <div className="bg-gradient-to-r from-primary/15 via-surface to-surface border border-primary/25 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Award size={14} /> Gold Member
            </p>
            <p className="text-4xl font-bold text-foreground mt-2 tabular-nums">2,450 pts</p>
            <p className="text-sm text-muted mt-1">≈ ₹2,450 usable on your next booking</p>
          </div>
          <div className="md:w-80">
            <div className="flex justify-between text-xs text-muted mb-1.5">
              <span>Gold</span>
              <span>Platinum at 4,000 pts</span>
            </div>
            <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
              <div className="h-full w-[61%] rounded-full bg-gradient-to-r from-primary to-primary-hover" />
            </div>
            <p className="text-[11px] text-subtle mt-2 flex items-center gap-1">
              <Flame size={11} className="text-terracotta" /> 1,550 pts to Platinum — free late checkouts & priority support
            </p>
          </div>
        </div>
      </div>

      <StatGrid
        stats={[
          { label: "Cashback Earned", value: "₹1,050", delta: "lifetime", icon: Gift },
          { label: "Coupons Active", value: "3", delta: "1 expiring soon", icon: Ticket },
          { label: "Referrals Joined", value: "4", delta: "₹2,000 earned", icon: Users },
          { label: "Membership", value: "Gold", delta: "since Jan 2026", icon: Award },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Your Coupons" icon={Ticket}>
          <ul className="divide-y divide-surface-hover">
            {coupons.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground bg-surface-hover border border-dashed border-border px-2.5 py-1 rounded-lg">
                      {c.code}
                    </span>
                    <StatusPill tone={c.tone}>{c.expiry}</StatusPill>
                  </div>
                  <p className="text-xs text-muted mt-1.5">{c.desc}</p>
                </div>
                <button
                  aria-label={`Copy ${c.code}`}
                  className="w-9 h-9 rounded-lg border border-border text-muted hover:text-foreground hover:border-border-light flex items-center justify-center transition-colors shrink-0"
                >
                  <Copy size={14} />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Cashback History" icon={Gift}>
          <ul className="divide-y divide-surface-hover">
            {cashback.map((c) => (
              <li key={c.label} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{c.label}</p>
                  <p className="text-xs text-subtle">{c.date}</p>
                </div>
                <span className="text-sm font-semibold text-sage tabular-nums">{c.amount}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Referral */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Share2 size={16} className="text-primary" /> Refer friends, earn ₹500 each
          </h2>
          <p className="text-sm text-muted mt-1.5 max-w-md">
            Your friend gets ₹500 off their first curated stay, you get ₹500 cashback after their first trip.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground bg-background border border-dashed border-primary/40 px-4 py-2.5 rounded-xl">
            dhyana.in/r/ANANYA500
          </span>
          <button className="px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-1.5">
            Share <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
