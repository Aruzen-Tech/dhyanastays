"use client";

import {
  MapPin,
  Bell,
  Percent,
  ShieldAlert,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SUPER HOST — Settings
// Cluster scope, approval thresholds, routing
// ============================================

export default function SuperHostSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Cluster scope, pricing approval thresholds and escalation routing."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Cluster Scope" icon={MapPin}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={MapPin}
              title="Regions in cluster"
              sub="Tamil Nadu · Pondicherry · Kerala · Karnataka · ECR"
              right={<StatusPill tone="sage">5 regions</StatusPill>}
            />
            <SettingRow
              icon={MapPin}
              title="Properties in cluster"
              sub="Updated automatically as regional hosts approve new listings"
              right={<span className="text-xs text-foreground font-semibold">32</span>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Pricing & Promotions" icon={Percent}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Percent}
              title="Auto-approve pricing changes under 5%"
              sub="Skip manual review for minor seasonal adjustments"
              right={<Toggle on />}
            />
            <SettingRow
              icon={Percent}
              title="Require approval for promo codes over 15% off"
              sub="Protects margin floor across the cluster"
              right={<Toggle on />}
            />
          </div>
        </SectionCard>

        <SectionCard title="Escalation Routing" icon={ShieldAlert}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={ShieldAlert}
              title="Escalate unresolved quality issues to"
              sub="After 72 hours without host action"
              right={<span className="text-xs text-foreground font-semibold">Regional Admin</span>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="Pricing & promo requests" sub="Real-time alert" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Quality audit due dates" sub="3 days before due" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Weekly cluster digest" sub="Monday 9 AM" right={<Toggle on />} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
