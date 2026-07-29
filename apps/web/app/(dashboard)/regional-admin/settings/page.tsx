"use client";

import {
  MapPin,
  Bell,
  Users,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// REGIONAL ADMIN — Settings
// Region scope, escalation routing, team roster
// ============================================

const team = [
  { name: "Rahul Verma", role: "Super Host", scope: "South Cluster (incl. this region)" },
  { name: "Divya Krishnan", role: "Regional Host", scope: "Tamil Nadu" },
  { name: "Priya Nair", role: "Support Lead", scope: "Escalation partner" },
];

export default function RegionalAdminSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Region scope, escalation routing and notification preferences."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Region Scope" icon={MapPin}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={MapPin}
              title="Assigned region"
              sub="Tamil Nadu · Pondicherry"
              right={<StatusPill tone="sage">Active</StatusPill>}
            />
            <SettingRow
              icon={ShieldAlert}
              title="Auto-approve verified repeat hosts"
              sub="Skip manual review for hosts with 3+ prior approvals"
              right={<Toggle on={false} />}
            />
          </div>
        </SectionCard>

        <SectionCard title="Escalation Routing" icon={ShieldAlert}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Clock}
              title="High-severity SLA"
              sub="Auto-escalate to Super Admin if unresolved"
              right={<span className="text-xs text-foreground font-semibold">4 hours</span>}
            />
            <SettingRow
              icon={Users}
              title="Escalation partner"
              sub="Customer support routes regional escalations here"
              right={<span className="text-xs text-foreground font-semibold">Priya Nair</span>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="New host/property submissions" sub="Real-time alert" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Escalation SLA warnings" sub="1 hour before breach" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Weekly regional digest" sub="Monday 9 AM" right={<Toggle on />} />
          </div>
        </SectionCard>

        <SectionCard title="Regional Team" icon={Users}>
          <ul className="divide-y divide-surface-hover">
            {team.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-subtle">{t.scope}</p>
                </div>
                <StatusPill tone="muted">{t.role}</StatusPill>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
