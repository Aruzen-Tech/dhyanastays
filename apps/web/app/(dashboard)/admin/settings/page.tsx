import {
  Settings,
  Percent,
  Bell,
  Server,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Map,
  MessageCircle,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="System Settings"
        subtitle="Platform-level configuration — commissions, features and integrations."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Commercial Rules" icon={Percent}>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            {[
              { label: "Stay commission", value: "15%" },
              { label: "Food & events commission", value: "10%" },
              { label: "Rental commission", value: "12%" },
              { label: "GST on services", value: "18%" },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-subtle mb-1.5">{f.label}</p>
                <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground tabular-nums">
                  {f.value}
                </div>
              </div>
            ))}
          </div>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Changes apply to new bookings only and are logged in the audit trail.
          </p>
        </SectionCard>

        <SectionCard title="Feature Toggles" icon={Settings}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Sparkles} title="AI Trip Planner" sub="Planner widget on all pages" right={<Toggle on />} />
            <SettingRow icon={Sparkles} title="AI Search" sub="Natural language discovery (beta)" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Homepage spotlight slot" sub="Sponsored placement (Module 24)" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Hostel & budget tab" sub="Services hub category" right={<Toggle on />} />
          </div>
        </SectionCard>

        <SectionCard title="Integrations" icon={Server}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={CreditCard}
              title="Razorpay"
              sub="Payments & payouts"
              right={<StatusPill tone="sage">Connected</StatusPill>}
            />
            <SettingRow
              icon={Map}
              title="Google Maps"
              sub="Map search & nearby discovery"
              right={<StatusPill tone="sage">Connected</StatusPill>}
            />
            <SettingRow
              icon={MessageCircle}
              title="WhatsApp Business"
              sub="Trip alerts & host chat"
              right={<StatusPill tone="primary">Sandbox</StatusPill>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Platform Health" icon={Server}>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "API uptime (30d)", value: "99.98%" },
              { label: "Avg page load", value: "1.2s" },
              { label: "Error rate", value: "0.03%" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span className="text-muted">{m.label}</span>
                <span className="text-foreground font-medium tabular-nums">{m.value}</span>
              </div>
            ))}
            <p className="text-[11px] text-subtle pt-1">
              Full observability lives in the Super Admin dashboard.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Maintenance mode */}
      <div className="border border-terracotta/30 bg-terracotta/5 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-terracotta/15 text-terracotta flex items-center justify-center">
            <AlertTriangle size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Maintenance mode</p>
            <p className="text-xs text-muted">Takes the public site offline with a status page. Dashboards stay reachable.</p>
          </div>
        </div>
        <Toggle />
      </div>
    </div>
  );
}
