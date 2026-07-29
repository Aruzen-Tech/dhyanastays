import {
  ShieldCheck,
  Percent,
  Zap,
  Bell,
  Lock,
  KeyRound,
  Users,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// FINANCE — Settings (Super Admin only)
// Access control · commission floor · gateway
// ============================================

const rates = [
  { service: "Curated stays", rate: "15%" },
  { service: "Events & planners", rate: "12%" },
  { service: "Vehicle rentals", rate: "12%" },
  { service: "Curated food", rate: "10%" },
  { service: "Experiences & workshops", rate: "10%" },
  { service: "Hostels & budget", rate: "10%" },
];

export default function FinanceSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Finance Settings"
          subtitle="Access control, commission rules and the payout gateway."
        />
        <StatusPill tone="sage">
          <ShieldCheck size={11} /> Super Admin only
        </StatusPill>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Access control */}
        <SectionCard title="Access Control" icon={Lock}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={KeyRound}
              title="Who can open Finance"
              sub="Super Admin role only — no delegation"
              right={<StatusPill tone="terracotta">Locked</StatusPill>}
            />
            <SettingRow
              icon={ShieldCheck}
              title="2FA + hardware key"
              sub="Required on every finance session"
              right={<Toggle on />}
            />
            <SettingRow
              icon={Users}
              title="Access audit trail"
              sub="Every view & export logged with IP and time"
              right={<StatusPill tone="sage">Always on</StatusPill>}
            />
          </div>
        </SectionCard>

        {/* Gateway */}
        <SectionCard title="Payment Gateway" icon={Zap}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Zap}
              title="Razorpay (collections)"
              sub="UPI · cards · netbanking · EMI"
              right={<StatusPill tone="sage">Connected</StatusPill>}
            />
            <SettingRow
              icon={Zap}
              title="RazorpayX (payouts)"
              sub="Automated host & partner transfers"
              right={<StatusPill tone="sage">Connected</StatusPill>}
            />
            <SettingRow
              icon={Bell}
              title="Settlement alerts"
              sub="Email on every gateway settlement file"
              right={<Toggle on />}
            />
          </div>
        </SectionCard>
      </div>

      {/* Commission rules */}
      <SectionCard title="Commission Rules" icon={Percent}>
        <div className="px-5 py-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-foreground">Platform floor: 10%</p>
            <p className="text-xs text-muted mt-0.5">
              No included service can be commissioned below 10%. Changing the floor requires a fresh Super Admin authentication.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rates.map((r) => (
              <div key={r.service} className="flex items-center justify-between rounded-xl bg-background border border-border px-4 py-3">
                <span className="text-xs text-muted">{r.service}</span>
                <span className={`text-sm font-bold tabular-nums ${r.rate === "10%" ? "text-primary" : "text-sage"}`}>
                  {r.rate}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-subtle mt-3">
            Rate changes apply to new bookings only and are versioned in the audit log.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
