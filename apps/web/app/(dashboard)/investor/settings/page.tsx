import { User, Bell, Landmark, ShieldCheck, FileText, Users } from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle } from "@/app/components/DashboardUI";

export default function InvestorSettingsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Investor Settings"
        subtitle="KYC, payout preferences, nominee and notifications."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Identity & KYC" icon={ShieldCheck}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={User}
              title="Navin Kumar"
              sub="Premium Investor · since Aug 2024"
              right={<span className="text-xs text-primary font-medium">Premium</span>}
            />
            <SettingRow
              icon={ShieldCheck}
              title="KYC status"
              sub="PAN + Aadhaar verified · Video KYC done"
              right={<span className="text-xs text-sage font-medium">Verified</span>}
            />
            <SettingRow
              icon={FileText}
              title="PAN"
              sub="AAKPN••••R · linked for TDS"
              right={<button className="text-xs text-primary hover:underline">View</button>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Payout Preferences" icon={Landmark}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Landmark}
              title="Distribution mode"
              sub="Auto-credit to wallet, monthly on the 1st"
              right={<button className="text-xs text-primary hover:underline">Change</button>}
            />
            <SettingRow
              icon={Landmark}
              title="Auto-withdraw"
              sub="Sweep wallet to bank when balance > ₹50,000"
              right={<Toggle />}
            />
            <SettingRow
              icon={FileText}
              title="Quarterly statements"
              sub="Emailed as PDF with TDS annexure"
              right={<Toggle on />}
            />
          </div>
        </SectionCard>

        <SectionCard title="Nominee" icon={Users}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={User}
              title="Sunita Kumar"
              sub="Spouse · 100% allocation"
              right={<button className="text-xs text-primary hover:underline">Edit</button>}
            />
          </div>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Nominee updates require OTP verification and take effect in 24 hours.
          </p>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="Distribution alerts" sub="When payouts are credited" right={<Toggle on />} />
            <SettingRow icon={Bell} title="New project launches" sub="Early access for premium investors" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Occupancy reports" sub="Monthly project performance email" right={<Toggle on />} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
