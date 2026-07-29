import {
  Hotel,
  FileText,
  TrendingUp,
  Megaphone,
  BookOpen,
  Briefcase,
  Clock,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// HOSPITALITY CONSULTANCY — Projects & Strategy
// Business plans · revenue models · branding · ops
// ============================================

const projects = [
  { name: "Nila Wellness — Phase 2 concept", client: "Nila Retreats Pvt Ltd", kind: "Business plan", due: "Aug 05", progress: 72, tone: "primary" as const, status: "In progress" },
  { name: "Canopy Village brand refresh", client: "Auroville Collective", kind: "Branding", due: "Jul 28", progress: 88, tone: "sage" as const, status: "Review" },
  { name: "Stone Valley revenue model 2027", client: "Priya Shankar", kind: "Revenue model", due: "Aug 20", progress: 35, tone: "primary" as const, status: "In progress" },
  { name: "Glass Pavilion ops manual v2", client: "Wayanad Estates", kind: "Operations manual", due: "Delivered Jul 10", progress: 100, tone: "muted" as const, status: "Delivered" },
];

const playbooks = [
  { icon: FileText, name: "Business Plans", count: "3 active", note: "concept to P&L, 6-week cycle" },
  { icon: TrendingUp, name: "Revenue Models", count: "2 active", note: "pricing bands, occupancy curves" },
  { icon: Megaphone, name: "Marketing Plans", count: "1 active", note: "launch + seasonal campaigns" },
  { icon: BookOpen, name: "Operations Manuals", count: "6 delivered", note: "SOPs, staffing, housekeeping" },
];

export default function ConsultancyProjectsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Projects & Strategy"
        subtitle="Consulting engagements for property owners — plans, models, branding and playbooks."
      />

      <StatGrid
        stats={[
          { label: "Active Projects", value: "5", delta: "2 launching Q3", icon: Briefcase },
          { label: "Deliverables Due", value: "3", delta: "next: Jul 28", icon: Clock },
          { label: "Delivered · 2026", value: "14", delta: "across 9 clients", icon: FileText },
          { label: "Client NPS", value: "68", delta: "last 12 months", icon: TrendingUp },
        ]}
      />

      {/* Projects */}
      <SectionCard title="Client Projects" icon={Hotel}>
        <ul className="divide-y divide-surface-hover">
          {projects.map((p) => (
            <li key={p.name} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {p.client} · {p.kind} · {p.due}
                  </p>
                </div>
                <StatusPill tone={p.tone}>{p.status}</StatusPill>
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.progress === 100 ? "bg-sage" : "bg-gradient-to-r from-primary to-primary-hover"}`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <span className="text-[11px] text-subtle tabular-nums w-8 text-right">{p.progress}%</span>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Playbooks */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {playbooks.map((p) => (
          <div key={p.name} className="bg-surface border border-border rounded-2xl p-5">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <p.icon size={18} />
            </span>
            <p className="text-sm font-semibold text-foreground">{p.name}</p>
            <p className="text-xs text-primary mt-0.5">{p.count}</p>
            <p className="text-[11px] text-subtle mt-1.5 leading-relaxed">{p.note}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-subtle">
        Owners approved through Listing Requests often become consulting clients — their concept, pricing and ops work starts here.
      </p>
    </div>
  );
}
