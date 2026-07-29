import { BarChart3, TrendingUp, CalendarDays, Percent } from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

const quarters = [
  { q: "Q3 '25", v: 42 },
  { q: "Q4 '25", v: 58 },
  { q: "Q1 '26", v: 66 },
  { q: "Q2 '26", v: 85 },
  { q: "Q3 '26", v: 92 },
];

const payouts = [
  { label: "Nila Wellness · June distribution", amount: "₹16,800", date: "Jul 01", status: "Paid", tone: "sage" as const },
  { label: "Canopy Village · June distribution", amount: "₹12,400", date: "Jul 01", status: "Paid", tone: "sage" as const },
  { label: "Stone Valley · June distribution", amount: "₹9,200", date: "Jul 01", status: "Paid", tone: "sage" as const },
  { label: "Nila Wellness · July distribution", amount: "≈ ₹17,500", date: "Aug 01", status: "Projected", tone: "primary" as const },
];

export default function InvestorRoiPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="ROI Analytics"
        subtitle="Returns, distributions and performance across your portfolio."
      />

      <StatGrid
        stats={[
          { label: "Portfolio XIRR", value: "17.4%", delta: "since Aug 2024", icon: Percent },
          { label: "Best Performer", value: "+28%", delta: "Nila Wellness", icon: TrendingUp },
          { label: "Distributions YTD", value: "₹2.6L", delta: "7 payouts" },
          { label: "Next Payout", value: "Aug 01", delta: "≈ ₹39,000 est.", icon: CalendarDays },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quarterly returns bars */}
        <SectionCard title="Quarterly Distributions" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-4 h-44">
              {quarters.map((b, i) => (
                <div key={b.q} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">₹{Math.round(b.v * 1.25)}k</span>
                  <div
                    className={`w-full max-w-[56px] rounded-t-lg ${
                      i === quarters.length - 1
                        ? "bg-gradient-to-t from-primary to-primary-hover"
                        : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${i === quarters.length - 1 ? "text-primary font-semibold" : "text-subtle"}`}>
                    {b.q}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-5 text-[11px] text-subtle">
              <span>Occupancy-linked returns · paid monthly, shown per quarter</span>
            </div>
          </div>
        </SectionCard>

        {/* Payout history */}
        <SectionCard title="Payout History" icon={CalendarDays}>
          <ul className="divide-y divide-surface-hover">
            {payouts.map((p) => (
              <li key={p.label} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-foreground truncate">{p.label}</p>
                  <StatusPill tone={p.tone}>{p.status}</StatusPill>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-subtle">{p.date}</span>
                  <span className="text-sm font-semibold text-sage tabular-nums">{p.amount}</span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
