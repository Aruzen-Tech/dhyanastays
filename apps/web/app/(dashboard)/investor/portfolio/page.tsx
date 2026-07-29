import { Briefcase, TrendingUp, Building, PiggyBank } from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

const holdings = [
  { project: "Nila Wellness Expansion", location: "Palakkad, Kerala", invested: "₹10.0L", value: "₹12.8L", roi: "+28.0%", share: 34, status: "Earning", tone: "sage" as const },
  { project: "Canopy Village · Phase 2", location: "Auroville, TN", invested: "₹7.5L", value: "₹8.9L", roi: "+18.7%", share: 25, status: "Earning", tone: "sage" as const },
  { project: "Stone Valley Cottages", location: "Kodaikanal, TN", invested: "₹6.0L", value: "₹6.6L", roi: "+10.0%", share: 21, status: "Ramp-up", tone: "primary" as const },
  { project: "Glass Pavilion Annexe", location: "Wayanad, Kerala", invested: "₹6.0L", value: "₹6.1L", roi: "+1.7%", share: 20, status: "Under construction", tone: "muted" as const },
];

const allocation = [
  { label: "Wellness retreats", pct: 34, cls: "bg-primary" },
  { label: "Tiny house villages", pct: 25, cls: "bg-sage" },
  { label: "Farm stays", pct: 21, cls: "bg-primary-hover" },
  { label: "Luxury villas", pct: 20, cls: "bg-terracotta" },
];

export default function InvestorPortfolioPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="My Portfolio"
        subtitle="Your holdings across Dhyana curated hospitality projects."
        action={{ label: "Explore New Projects", href: "/investor/projects", icon: Building }}
      />

      <StatGrid
        stats={[
          { label: "Total Invested", value: "₹29.5L", icon: PiggyBank },
          { label: "Current Value", value: "₹34.4L", delta: "+16.6% overall", icon: TrendingUp },
          { label: "Active Projects", value: "4", delta: "2 earning monthly" },
          { label: "Monthly Payout", value: "₹38,400", delta: "avg last 3 months" },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Holdings table */}
        <SectionCard title="Holdings" icon={Briefcase} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-3 py-3 font-semibold">Invested</th>
                  <th className="px-3 py-3 font-semibold">Value</th>
                  <th className="px-3 py-3 font-semibold">ROI</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover">
                {holdings.map((h) => (
                  <tr key={h.project} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground font-medium">{h.project}</p>
                      <p className="text-[11px] text-subtle">{h.location}</p>
                    </td>
                    <td className="px-3 py-4 text-sm text-muted tabular-nums">{h.invested}</td>
                    <td className="px-3 py-4 text-sm text-foreground font-medium tabular-nums">{h.value}</td>
                    <td className="px-3 py-4 text-sm font-semibold text-sage tabular-nums">{h.roi}</td>
                    <td className="px-5 py-4 text-right">
                      <StatusPill tone={h.tone}>{h.status}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Allocation */}
        <SectionCard title="Allocation" icon={TrendingUp}>
          <div className="px-5 py-5">
            <div className="flex h-3 rounded-full overflow-hidden mb-5">
              {allocation.map((a) => (
                <div key={a.label} className={a.cls} style={{ width: `${a.pct}%` }} />
              ))}
            </div>
            <ul className="space-y-3">
              {allocation.map((a) => (
                <li key={a.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted">
                    <span className={`w-2.5 h-2.5 rounded-full ${a.cls}`} />
                    {a.label}
                  </span>
                  <span className="text-foreground font-medium tabular-nums">{a.pct}%</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-subtle mt-5">
              Diversified across 3 regions. Rebalancing suggestions appear when any class crosses 40%.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
