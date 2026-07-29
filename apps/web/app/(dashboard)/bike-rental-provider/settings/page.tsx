import {
  Landmark,
  Bell,
  MapPin,
  FileText,
  Bike,
  Clock,
  ShieldCheck,
  IndianRupee,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// BIKE RENTAL PROVIDER — Settings
// ============================================

export default function RentalSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Business details, rental terms, payouts and notifications for Auro Wheels."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Business Profile" icon={Bike}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Bike}
              title="Auro Wheels Rentals"
              sub="Suresh Babu · since 2020 · Auroville & Pondicherry"
              right={<StatusPill tone="sage">Verified partner</StatusPill>}
            />
            <SettingRow
              icon={FileText}
              title="Rental business licence"
              sub="RTO trade certificate · valid till 2028"
              right={<span className="text-xs text-sage font-medium">Valid</span>}
            />
            <SettingRow
              icon={MapPin}
              title="Pickup points"
              sub="Shop (ECR Junction) · doorstep within 6 km"
              right={<button className="text-xs text-primary hover:underline">Edit</button>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Rental Terms" icon={IndianRupee}>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            {[
              { label: "Security deposit", value: "₹2,000 · refundable" },
              { label: "Fuel policy", value: "Full-to-full" },
              { label: "Km limit", value: "Unlimited" },
              { label: "Late fee", value: "₹100/hour after grace" },
              { label: "Helmets included", value: "2 per two-wheeler" },
              { label: "Min renter age", value: "21 · valid DL" },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-subtle mb-1.5">{f.label}</p>
                <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Payout Account" icon={Landmark}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Landmark}
              title="Canara Bank · Current"
              sub="•••• 3308 · settles every Friday"
              right={<StatusPill tone="sage">Verified</StatusPill>}
            />
            <SettingRow
              icon={FileText}
              title="Commission plan"
              sub="12% per rental · delivery add-on 0%"
              right={<button className="text-xs text-primary hover:underline">View plan</button>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="New booking alerts" sub="SMS + WhatsApp, instant" right={<Toggle on />} />
            <SettingRow icon={Clock} title="Return reminders" sub="2h before each due-back time" right={<Toggle on />} />
            <SettingRow icon={ShieldCheck} title="Insurance expiry alerts" sub="30, 15 and 7 days before" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Overdue escalations" sub="Auto-call renter after 2h overdue" right={<Toggle />} />
          </div>
        </SectionCard>
      </div>

      {/* Pause listings */}
      <div className="border border-border bg-surface rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-surface-hover text-muted flex items-center justify-center">
            <Bike size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Pause new bookings</p>
            <p className="text-xs text-muted">
              Hide your fleet from discovery temporarily — active rentals continue as normal.
            </p>
          </div>
        </div>
        <Toggle />
      </div>
    </div>
  );
}
