import {
  TrendingUp,
  BarChart3,
  MousePointerClick,
  Ticket,
  MapPin,
  Download,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// MARKETING — Performance
// Leads, conversions, regions, promo codes
// ============================================

const months = [
  { m: "Mar", v: 48 },
  { m: "Apr", v: 60 },
  { m: "May", v: 55 },
  { m: "Jun", v: 76 },
  { m: "Jul", v: 92 },
];

const byRegion = [
  { label: "Tamil Nadu", pct: 42, leads: 520 },
  { label: "Pondicherry", pct: 22, leads: 273 },
  { label: "Kerala", pct: 18, leads: 223 },
  { label: "Karnataka", pct: 12, leads: 149 },
  { label: "Goa", pct: 6, leads: 75 },
];

const campaigns = [
  { name: "Monsoon Wellness Week", ctr: "3.7%", conversions: 218, cpl: "₹92", status: "Live", tone: "sage" as const },
  { name: "Weekend Escapes · 15% off", ctr: "4.6%", conversions: 187, cpl: "₹74", status: "Live", tone: "sage" as const },
  { name: "Pre-book Chettinad Feast", ctr: "7.3%", conversions: 141, cpl: "₹51", status: "Live", tone: "sage" as const },
  { name: "Summer Farm Camps", ctr: "4.7%", conversions: 164, cpl: "₹88", status: "Ended", tone: "muted" as const },
];

const promos = [
  { code: "MONSOON20", uses: 178, revenue: "₹4.1L" },
  { code: "WEEKEND500", uses: 96, revenue: "₹2.2L" },
  { code: "FOODIE15", uses: 38, revenue: "₹0.6L" },
];

export default function MarketingPerformancePage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Performance"
        subtitle="Leads, conversions and promo redemptions across campaigns and regions."
        action={{ label: "Export Report", href: "/marketing/performance", icon: Download }}
      />

      <StatGrid
        stats={[
          { label: "Leads · July", value: "1,240", delta: "+22% MoM", icon: TrendingUp },
          { label: "Conversion Rate", value: "3.8%", delta: "+0.4 pts", icon: MousePointerClick },
          { label: "Promo Redemptions", value: "312", delta: "MONSOON20 leads", icon: Ticket },
          { label: "Best Region", value: "Tamil Nadu", delta: "42% of leads", icon: MapPin },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leads trend */}
        <SectionCard title="Leads per Month" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-3 h-44">
              {months.map((b, i) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">{Math.round(b.v * 13.5)}</span>
                  <div
                    className={`w-full max-w-[48px] rounded-t-lg ${
                      i === months.length - 1 ? "bg-gradient-to-t from-primary to-primary-hover" : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${i === months.length - 1 ? "text-primary font-semibold" : "text-subtle"}`}>{b.m}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Region split */}
        <SectionCard title="Leads by Region" icon={MapPin}>
          <div className="px-5 py-5 space-y-4">
            {byRegion.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted">{c.label}</span>
                  <span className="text-foreground font-medium tabular-nums">{c.leads}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-sage to-primary" style={{ width: `${c.pct * 2.2}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Campaign table */}
      <SectionCard title="Campaign Performance" icon={TrendingUp}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                <th className="px-5 py-3 font-semibold">Campaign</th>
                <th className="px-3 py-3 font-semibold">CTR</th>
                <th className="px-3 py-3 font-semibold">Conversions</th>
                <th className="px-3 py-3 font-semibold">Cost / Lead</th>
                <th className="px-5 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {campaigns.map((c) => (
                <tr key={c.name} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-foreground font-medium">{c.name}</td>
                  <td className="px-3 py-3.5 text-sm text-muted tabular-nums">{c.ctr}</td>
                  <td className="px-3 py-3.5 text-sm text-foreground font-medium tabular-nums">{c.conversions}</td>
                  <td className="px-3 py-3.5 text-sm text-muted tabular-nums">{c.cpl}</td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusPill tone={c.tone}>{c.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Promo codes */}
      <SectionCard title="Promo Code Redemptions" icon={Ticket}>
        <div className="grid sm:grid-cols-3 gap-4 p-5">
          {promos.map((p) => (
            <div key={p.code} className="rounded-xl bg-background border border-dashed border-primary/40 p-4 text-center">
              <p className="font-mono text-sm font-bold text-foreground">{p.code}</p>
              <p className="text-2xl font-bold text-primary mt-1 tabular-nums">{p.uses}</p>
              <p className="text-[11px] text-subtle">redemptions · {p.revenue} booked</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
