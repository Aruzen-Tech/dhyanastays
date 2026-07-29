import {
  ClipboardList,
  BarChart3,
  Download,
  TrendingUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SOS MANAGER — Reports
// Resolution reports & emergency analytics
// ============================================

const months = [
  { m: "Mar", v: 46 },
  { m: "Apr", v: 58 },
  { m: "May", v: 40 },
  { m: "Jun", v: 66 },
  { m: "Jul", v: 76 },
];

const byType = [
  { label: "Medical assist", pct: 34, count: 13 },
  { label: "Vehicle breakdown", pct: 26, count: 10 },
  { label: "Lost route / trek", pct: 18, count: 7 },
  { label: "Safety check", pct: 13, count: 5 },
  { label: "Other", pct: 9, count: 3 },
];

const cases = [
  { id: "SOS-0142", guest: "Anita Desai", type: "Medical", where: "Nila Wellness Retreat", response: "3m 10s", resolved: "18 min", date: "Jul 16", status: "Resolved", tone: "sage" as const },
  { id: "SOS-0141", guest: "Trek group (4)", type: "Lost route", where: "Munnar ridge", response: "4m 55s", resolved: "41 min", date: "Jul 14", status: "Resolved", tone: "sage" as const },
  { id: "SOS-0140", guest: "Daniel M.", type: "Vehicle", where: "ECR night ride", response: "3m 40s", resolved: "26 min", date: "Jul 12", status: "Resolved", tone: "sage" as const },
  { id: "SOS-0139", guest: "Sneha Reddy", type: "Safety check", where: "Glass Pavilion", response: "2m 05s", resolved: "on call", date: "Jul 11", status: "Resolved", tone: "sage" as const },
  { id: "SOS-0137", guest: "Rohit Rao", type: "Medical", where: "Stone Valley Farm", response: "6m 20s", resolved: "52 min", date: "Jul 08", status: "SLA breach", tone: "terracotta" as const },
];

export default function SosReportsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Reports"
        subtitle="Resolution reports and emergency analytics across all incidents."
        action={{ label: "Export Monthly PDF", href: "/sos-manager/reports", icon: Download }}
      />

      <StatGrid
        stats={[
          { label: "Incidents · July", value: "38", delta: "37 resolved · 1 live", icon: ClipboardList },
          { label: "Avg Response", value: "4m 12s", delta: "-38s vs June", icon: Clock },
          { label: "Avg Resolution", value: "27 min", delta: "alert → case closed", icon: TrendingUp },
          { label: "SLA Compliance", value: "97%", delta: "1 breach reviewed", icon: ShieldCheck },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly incidents */}
        <SectionCard title="Incidents per Month" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-3 h-44">
              {months.map((b, i) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">{Math.round(b.v / 2)}</span>
                  <div
                    className={`w-full max-w-[48px] rounded-t-lg ${
                      i === months.length - 1 ? "bg-gradient-to-t from-terracotta to-terracotta/70" : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${i === months.length - 1 ? "text-terracotta font-semibold" : "text-subtle"}`}>{b.m}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-subtle mt-4">
              Peak months track monsoon trekking season — most incidents are non-critical vehicle and route assists.
            </p>
          </div>
        </SectionCard>

        {/* By type */}
        <SectionCard title="Incidents by Type" icon={TrendingUp}>
          <div className="px-5 py-5 space-y-4">
            {byType.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted">{c.label}</span>
                  <span className="text-foreground font-medium tabular-nums">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-terracotta/70 to-terracotta" style={{ width: `${c.pct * 2.5}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Resolution reports table */}
      <SectionCard title="Resolution Reports" icon={ClipboardList}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                <th className="px-5 py-3 font-semibold">Case</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Location</th>
                <th className="px-3 py-3 font-semibold">Response</th>
                <th className="px-3 py-3 font-semibold">Resolved In</th>
                <th className="px-5 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-foreground font-medium">{c.id}</p>
                    <p className="text-[11px] text-subtle">{c.guest} · {c.date}</p>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted">{c.type}</td>
                  <td className="px-3 py-3.5 text-xs text-muted">{c.where}</td>
                  <td className="px-3 py-3.5 text-xs text-foreground font-medium tabular-nums">{c.response}</td>
                  <td className="px-3 py-3.5 text-xs text-muted tabular-nums">{c.resolved}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <StatusPill tone={c.tone}>{c.status}</StatusPill>
                      <button
                        aria-label={`Download report ${c.id}`}
                        className="w-8 h-8 rounded-lg border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 pb-4 pt-2 text-[11px] text-subtle">
          Each report includes the GPS trail, call log and responder notes — shared with admins automatically.
        </p>
      </SectionCard>
    </div>
  );
}
