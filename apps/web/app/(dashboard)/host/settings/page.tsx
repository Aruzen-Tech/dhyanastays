import { Landmark, Bell, FileText, Clock, ShieldCheck, User } from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle } from "@/app/components/DashboardUI";

export default function HostSettingsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Host Settings"
        subtitle="Payouts, notifications and default policies for your listings."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Payout Account" icon={Landmark}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Landmark}
              title="ICICI Bank · Savings"
              sub="•••• 8834 · payouts on the 1st of every month"
              right={<span className="text-xs text-sage font-medium">Verified</span>}
            />
            <SettingRow
              icon={FileText}
              title="GSTIN"
              sub="33AAKCV2210P1ZH · Tamil Nadu"
              right={<button className="text-xs text-primary hover:underline">Update</button>}
            />
            <SettingRow
              icon={User}
              title="PAN"
              sub="AAKPV••••K · linked"
              right={<span className="text-xs text-sage font-medium">Linked</span>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="New booking alerts" sub="SMS + WhatsApp + email" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Guest messages" sub="Push notification, instant" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Payout confirmations" sub="Email with statement PDF" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Smart pricing tips" sub="Weekly demand insights" right={<Toggle />} />
          </div>
        </SectionCard>

        <SectionCard title="Default Policies" icon={FileText}>
          <div className="px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-subtle mb-1.5">Cancellation policy</p>
                <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                  Flexible · full refund 48h prior
                </div>
              </div>
              <div>
                <p className="text-xs text-subtle mb-1.5">Check-in window</p>
                <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                  2:00 PM – 8:00 PM
                </div>
              </div>
            </div>
            <p className="text-[11px] text-subtle">
              Applies to new listings by default — each property can override these.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Trust & Verification" icon={ShieldCheck}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={ShieldCheck}
              title="Identity verification"
              sub="Aadhaar verified · Jan 2026"
              right={<span className="text-xs text-sage font-medium">Verified</span>}
            />
            <SettingRow
              icon={Clock}
              title="Response commitment"
              sub="You reply in under 1 hour on average"
              right={<span className="text-xs text-primary font-medium">Top 10%</span>}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
