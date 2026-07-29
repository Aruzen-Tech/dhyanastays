import {
  BarChart3,
  Zap,
  Droplets,
  Wifi,
  Users,
  Wrench,
  Receipt,
  Landmark,
  TrendingUp,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid } from "@/app/components/DashboardUI";

const months = [
  { m: "Feb", v: 62 },
  { m: "Mar", v: 78 },
  { m: "Apr", v: 55 },
  { m: "May", v: 70 },
  { m: "Jun", v: 88 },
  { m: "Jul", v: 96 },
];

const expenses = [
  { icon: Zap, label: "Electricity", amount: "₹6,840" },
  { icon: Droplets, label: "Water", amount: "₹1,120" },
  { icon: Wifi, label: "Internet", amount: "₹1,499" },
  { icon: Users, label: "Housekeeping & labour", amount: "₹14,500" },
  { icon: Wrench, label: "Maintenance & repairs", amount: "₹4,300" },
  { icon: Receipt, label: "Consumables", amount: "₹3,150" },
  { icon: Landmark, label: "Property tax (monthly)", amount: "₹2,083" },
];

export default function HostRevenuePage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Revenue & Earnings"
        subtitle="Income, occupancy and running costs across your properties."
      />

      <StatGrid
        stats={[
          { label: "Today", value: "₹9,000", delta: "2 active stays" },
          { label: "This Week", value: "₹41,200", delta: "+12% WoW" },
          { label: "This Month", value: "₹1.46L", delta: "+9% MoM", icon: TrendingUp },
          { label: "This Year", value: "₹9.8L", delta: "78% occupancy" },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue bars */}
        <SectionCard title="Monthly Revenue" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-3 h-48">
              {months.map((b) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">₹{Math.round(b.v * 1.52)}k</span>
                  <div
                    className={`w-full max-w-[48px] rounded-t-lg ${
                      b.m === "Jul"
                        ? "bg-gradient-to-t from-primary to-primary-hover"
                        : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${b.m === "Jul" ? "text-primary font-semibold" : "text-subtle"}`}>
                    {b.m}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-subtle mt-4">
              July is tracking to be your best month yet — payout lands on the 1st of next month.
            </p>
          </div>
        </SectionCard>

        {/* Expenses */}
        <SectionCard title="Expenses · July" icon={Receipt}>
          <ul className="divide-y divide-surface-hover">
            {expenses.map((e) => (
              <li key={e.label} className="flex items-center justify-between px-5 py-3">
                <span className="flex items-center gap-2.5 text-sm text-muted">
                  <e.icon size={14} className="text-subtle" />
                  {e.label}
                </span>
                <span className="text-sm text-foreground font-medium tabular-nums">{e.amount}</span>
              </li>
            ))}
            <li className="flex items-center justify-between px-5 py-3.5 bg-surface-hover/50">
              <span className="text-sm font-semibold text-foreground">Total expenses</span>
              <span className="text-sm font-bold text-terracotta tabular-nums">₹33,492</span>
            </li>
            <li className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm font-semibold text-foreground">Net earnings (Jul)</span>
              <span className="text-sm font-bold text-sage tabular-nums">₹1,12,508</span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
