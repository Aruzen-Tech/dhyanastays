import { BarChart3, TrendingUp, Building, Star } from "lucide-react";
import { PageHeader, SectionCard, StatGrid } from "@/app/components/DashboardUI";

const months = [
  { m: "Feb", v: 52 },
  { m: "Mar", v: 61 },
  { m: "Apr", v: 48 },
  { m: "May", v: 66 },
  { m: "Jun", v: 82 },
  { m: "Jul", v: 94 },
];

const byCategory = [
  { label: "Curated stays", pct: 62, amount: "₹26.4L", cls: "bg-primary" },
  { label: "Curated food", pct: 14, amount: "₹6.0L", cls: "bg-sage" },
  { label: "Events & workshops", pct: 11, amount: "₹4.7L", cls: "bg-primary-hover" },
  { label: "Vehicle rentals", pct: 8, amount: "₹3.4L", cls: "bg-terracotta" },
  { label: "Consultancy", pct: 5, amount: "₹2.1L", cls: "bg-border-light" },
];

const topProperties = [
  { name: "Nila Wellness Retreat", city: "Palakkad", revenue: "₹4.8L", growth: "+21%" },
  { name: "The Glass Pavilion", city: "Wayanad", revenue: "₹4.1L", growth: "+16%" },
  { name: "The Canopy Tiny House", city: "Auroville", revenue: "₹2.9L", growth: "+12%" },
  { name: "Stone Valley Farm Stay", city: "Kodaikanal", revenue: "₹2.6L", growth: "+9%" },
];

export default function AdminRevenuePage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Global Revenue"
        subtitle="Platform-wide earnings across stays, food, events, rentals and consultancy."
      />

      <StatGrid
        stats={[
          { label: "GMV · July", value: "₹42.6L", delta: "+15% MoM", icon: TrendingUp },
          { label: "Platform Commission", value: "₹6.4L", delta: "15% avg take rate" },
          { label: "Active Properties", value: "187", delta: "across 45 destinations", icon: Building },
          { label: "Avg Booking Value", value: "₹11,840", delta: "+₹640 MoM" },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly bars */}
        <SectionCard title="Monthly GMV" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-3 h-48">
              {months.map((b) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">₹{(b.v * 0.453).toFixed(1)}L</span>
                  <div
                    className={`w-full max-w-[48px] rounded-t-lg ${
                      b.m === "Jul" ? "bg-gradient-to-t from-primary to-primary-hover" : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${b.m === "Jul" ? "text-primary font-semibold" : "text-subtle"}`}>{b.m}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* By category */}
        <SectionCard title="Revenue by Service" icon={TrendingUp}>
          <div className="px-5 py-5 space-y-4">
            {byCategory.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted">{c.label}</span>
                  <span className="text-foreground font-medium tabular-nums">{c.amount}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className={`h-full rounded-full ${c.cls}`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Top properties */}
      <SectionCard title="Top Earning Properties · July" icon={Star}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[480px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">Property</th>
                <th className="px-3 py-3 font-semibold">Revenue</th>
                <th className="px-5 py-3 font-semibold text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {topProperties.map((p, i) => (
                <tr key={p.name} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-bold text-primary tabular-nums">{i + 1}</td>
                  <td className="px-3 py-3.5">
                    <p className="text-sm text-foreground font-medium">{p.name}</p>
                    <p className="text-[11px] text-subtle">{p.city}</p>
                  </td>
                  <td className="px-3 py-3.5 text-sm text-foreground font-medium tabular-nums">{p.revenue}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold text-sage tabular-nums">{p.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
