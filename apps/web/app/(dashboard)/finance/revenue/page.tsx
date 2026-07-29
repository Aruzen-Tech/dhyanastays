import {
  BarChart3,
  Percent,
  MapPin,
  TrendingUp,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// FINANCE — Revenue & Regions (Super Admin only)
// Overall GMV, region-wise split, commission by
// service — platform floor: minimum 10%.
// ============================================

const months = [
  { m: "Feb", v: 52 },
  { m: "Mar", v: 61 },
  { m: "Apr", v: 48 },
  { m: "May", v: 66 },
  { m: "Jun", v: 82 },
  { m: "Jul", v: 94 },
];

const regionTable = [
  { region: "Tamil Nadu", gmv: "₹18.2L", commission: "₹2.8L", growth: "+14%", top: "Curated stays" },
  { region: "Pondicherry", gmv: "₹9.4L", commission: "₹1.4L", growth: "+21%", top: "Food & events" },
  { region: "Kerala", gmv: "₹8.1L", commission: "₹1.2L", growth: "+9%", top: "Wellness retreats" },
  { region: "Karnataka", gmv: "₹4.7L", commission: "₹0.7L", growth: "+6%", top: "Farm stays" },
  { region: "Goa", gmv: "₹2.2L", commission: "₹0.3L", growth: "new", top: "Hostels" },
];

const commissions = [
  { service: "Curated stays", rate: "15%", revenue: "₹3.96L", share: 62 },
  { service: "Events & planners", rate: "12%", revenue: "₹0.98L", share: 15 },
  { service: "Curated food", rate: "10%", revenue: "₹0.60L", share: 9 },
  { service: "Vehicle rentals", rate: "12%", revenue: "₹0.41L", share: 7 },
  { service: "Experiences & workshops", rate: "10%", revenue: "₹0.29L", share: 5 },
  { service: "Hostels & budget", rate: "10%", revenue: "₹0.16L", share: 2 },
];

export default function FinanceRevenuePage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Revenue & Regions"
          subtitle="Overall revenue, the region-wise split, and commission earned from every service."
        />
        <StatusPill tone="sage">
          <ShieldCheck size={11} /> Super Admin only
        </StatusPill>
      </div>

      <StatGrid
        stats={[
          { label: "GMV · July", value: "₹42.6L", delta: "+15% MoM", icon: TrendingUp },
          { label: "Total Commission", value: "₹6.4L", delta: "15% blended rate", icon: Percent },
          { label: "Best Region", value: "Tamil Nadu", delta: "43% of GMV", icon: MapPin },
          { label: "GST Payable", value: "₹3.4L", delta: "due Jul 20", icon: Landmark },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Overall revenue */}
        <SectionCard title="Overall GMV per Month" icon={BarChart3} className="lg:col-span-2">
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

        {/* Tax mini */}
        <SectionCard title="Tax & Compliance" icon={Landmark}>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "GST collected · July", value: "₹5.1L" },
              { label: "GST payable (after ITC)", value: "₹3.4L" },
              { label: "TDS on partner payouts", value: "₹0.42L" },
              { label: "Next filing", value: "GSTR-3B · Jul 20" },
            ].map((t) => (
              <div key={t.label} className="flex items-center justify-between text-sm">
                <span className="text-muted text-xs">{t.label}</span>
                <span className="text-foreground font-medium tabular-nums text-sm">{t.value}</span>
              </div>
            ))}
            <p className="text-[11px] text-subtle pt-1">Filings prepared automatically from the payments ledger.</p>
          </div>
        </SectionCard>
      </div>

      {/* Region table */}
      <SectionCard title="Region-wise Revenue" icon={MapPin}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                <th className="px-5 py-3 font-semibold">Region</th>
                <th className="px-3 py-3 font-semibold">GMV</th>
                <th className="px-3 py-3 font-semibold">Commission</th>
                <th className="px-3 py-3 font-semibold">Growth</th>
                <th className="px-5 py-3 font-semibold text-right">Top Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {regionTable.map((r) => (
                <tr key={r.region} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-foreground font-medium">{r.region}</td>
                  <td className="px-3 py-3.5 text-sm text-foreground tabular-nums">{r.gmv}</td>
                  <td className="px-3 py-3.5 text-sm text-sage font-semibold tabular-nums">{r.commission}</td>
                  <td className="px-3 py-3.5 text-sm text-muted tabular-nums">{r.growth}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-muted">{r.top}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Commission by service */}
      <SectionCard title="Commission by Service · July" icon={Percent}>
        <ul className="divide-y divide-surface-hover">
          {commissions.map((c) => (
            <li key={c.service} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-52 shrink-0">
                <p className="text-sm text-foreground font-medium">{c.service}</p>
              </div>
              <StatusPill tone={c.rate === "10%" ? "primary" : "sage"}>{c.rate}</StatusPill>
              <div className="flex-1 h-2 rounded-full bg-surface-hover overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover" style={{ width: `${c.share}%` }} />
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums w-16 text-right">{c.revenue}</span>
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 pt-2 text-[11px] text-subtle">
          Platform rule: commission never drops below the <span className="text-foreground font-medium">10% floor</span> on any included service. Rates above the floor are set per category by the Super Admin.
        </p>
      </SectionCard>
    </div>
  );
}
