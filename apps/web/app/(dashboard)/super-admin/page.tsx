"use client";

import {
  Server,
  Percent,
  Lock,
  Database,
  ShieldCheck,
  Activity,
  Flag,
  Clock,
} from "lucide-react";
import { PageHeader, StatGrid, SectionCard, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SUPER ADMIN — Overview (Founder Dashboard)
// Full-access root view: system health, feature
// rollouts, and the platform's live audit feed.
// ============================================

const modules = [
  { icon: Server, title: "Platform Control", href: "/super-admin/platform", desc: "All modules, feature flags, listings, ads" },
  { icon: Percent, title: "Commerce Rules", href: "/super-admin/commerce", desc: "Pricing, commission floors, revenue control" },
  { icon: Lock, title: "Security & Access", href: "/super-admin/security", desc: "Permissions, admin roster, audit logs" },
  { icon: Database, title: "Systems & AI", href: "/super-admin/systems", desc: "Integrations, health, AI settings, backups" },
];

const auditFeed = [
  { id: "a1", text: "CA Neha Gupta approved a ₹1.8L payout batch", time: "2 min ago", tone: "sage" as const },
  { id: "a2", text: "Feature flag \"ai-concierge-v2\" rolled out to 25%", time: "18 min ago", tone: "primary" as const },
  { id: "a3", text: "Meera Chandran approved 2 new host applications — TN region", time: "41 min ago", tone: "sage" as const },
  { id: "a4", text: "Failed login attempt blocked — unrecognised device", time: "1h ago", tone: "terracotta" as const },
  { id: "a5", text: "Rahul Verma updated pricing rules for South Cluster", time: "2h ago", tone: "muted" as const },
];

const flags = [
  { name: "ai-concierge-v2", rollout: 25, status: "Rolling out" },
  { name: "membership-founders-circle", rollout: 100, status: "Live" },
  { name: "regional-admin-dashboard", rollout: 100, status: "Live" },
  { name: "razorpayx-auto-refunds", rollout: 10, status: "Testing" },
];

export default function SuperAdminPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Super Admin"
          subtitle="Root access — every module, every region, every rupee. Nothing here is scoped."
        />
        <StatusPill tone="sage">
          <ShieldCheck size={11} /> Full platform access · audit logged
        </StatusPill>
      </div>

      <StatGrid
        stats={[
          { label: "Modules Online", value: "26/26", delta: "all healthy", icon: Server },
          { label: "Feature Flags", value: "14", delta: "3 in rollout", icon: Flag },
          { label: "System Uptime", value: "99.98%", delta: "30 days", icon: Activity },
          { label: "Audit Events Today", value: "1,872", delta: "0 critical", icon: Clock },
        ]}
      />

      {/* Module shortcuts */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((m) => (
          <a
            key={m.title}
            href={m.href}
            className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors group"
          >
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <m.icon size={18} />
            </span>
            <p className="text-sm font-semibold text-foreground mt-3.5 group-hover:text-primary transition-colors">{m.title}</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">{m.desc}</p>
          </a>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Live Audit Feed" icon={Activity} className="lg:col-span-2">
          <ul className="divide-y divide-surface-hover">
            {auditFeed.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <StatusPill tone={a.tone}>•</StatusPill>
                  <p className="text-xs text-muted leading-relaxed">{a.text}</p>
                </div>
                <span className="text-[10px] text-subtle shrink-0 whitespace-nowrap">{a.time}</span>
              </li>
            ))}
          </ul>
          <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover">
            Every action across every dashboard is written here — retained 24 months.
          </p>
        </SectionCard>

        <SectionCard title="Feature Flag Rollouts" icon={Flag}>
          <div className="px-5 py-4 space-y-4">
            {flags.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-foreground font-mono">{f.name}</span>
                  <span className="text-subtle">{f.rollout}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${f.rollout}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
