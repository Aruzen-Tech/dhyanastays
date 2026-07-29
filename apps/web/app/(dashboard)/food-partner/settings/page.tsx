import {
  Landmark,
  Bell,
  MapPin,
  FileText,
  UtensilsCrossed,
  Clock,
  Bike,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// FOOD PARTNER — Settings
// ============================================

export default function FoodPartnerSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Licences, payouts, service hours and notifications for Meena's Kitchen."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Licences & Compliance" icon={ShieldCheck}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={FileText}
              title="FSSAI licence"
              sub="12224026000xxx · valid till Mar 2027"
              right={<StatusPill tone="sage">Valid</StatusPill>}
            />
            <SettingRow
              icon={FileText}
              title="GSTIN"
              sub="33AAVFM6612Q1ZK · composition scheme"
              right={<button className="text-xs text-primary hover:underline">Update</button>}
            />
            <SettingRow
              icon={ShieldCheck}
              title="Hygiene audit"
              sub="Last inspected Jun 12 · score 96/100"
              right={<span className="text-xs text-sage font-medium">Passed</span>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Payout Account" icon={Landmark}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Landmark}
              title="Indian Bank · Current"
              sub="•••• 7719 · settles every Friday"
              right={<StatusPill tone="sage">Verified</StatusPill>}
            />
            <SettingRow
              icon={FileText}
              title="Commission plan"
              sub="10% per order · packages 8%"
              right={<button className="text-xs text-primary hover:underline">View plan</button>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Service Hours & Delivery" icon={Clock}>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-subtle mb-1.5">Kitchen hours</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                7:00 AM – 9:30 PM
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-1.5">Weekly off</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                Monday
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-1.5">Delivery radius</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground flex items-center gap-2">
                <Bike size={14} className="text-subtle" /> 6 km · 4 partner stays
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-1.5">Pre-booking lead time</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                Minimum 4 hours
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="New order alerts" sub="Kitchen display + SMS, instant" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Pre-booking reminders" sub="Evening before each pre-booked meal" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Payout confirmations" sub="Email with weekly settlement report" right={<Toggle on />} />
            <SettingRow icon={UtensilsCrossed} title="Low-stock nudges" sub="When a dish sells out repeatedly" right={<Toggle />} />
          </div>
        </SectionCard>
      </div>

      {/* Pause kitchen */}
      <div className="border border-border bg-surface rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-surface-hover text-muted flex items-center justify-center">
            <MapPin size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Pause new orders</p>
            <p className="text-xs text-muted">
              Temporarily stop live orders — confirmed pre-bookings stay active.
            </p>
          </div>
        </div>
        <Toggle />
      </div>
    </div>
  );
}
