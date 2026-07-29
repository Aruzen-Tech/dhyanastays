import {
  User,
  Bell,
  Lock,
  Globe,
  CreditCard,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle } from "@/app/components/DashboardUI";

export default function TravellerSettingsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Settings"
        subtitle="Account, notifications, privacy and payment preferences."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Account" icon={User}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Mail}
              title="Email address"
              sub="ananya.rao@gmail.com"
              right={<button className="text-xs text-primary hover:underline">Change</button>}
            />
            <SettingRow
              icon={Phone}
              title="Phone number"
              sub="+91 98407 22110 · verified"
              right={<button className="text-xs text-primary hover:underline">Change</button>}
            />
            <SettingRow
              icon={ShieldCheck}
              title="KYC verification"
              sub="Aadhaar verified on 12 Jan 2026"
              right={<span className="text-xs text-sage font-medium">Verified</span>}
            />
            <SettingRow
              icon={Lock}
              title="Password"
              sub="Last changed 3 months ago"
              right={<button className="text-xs text-primary hover:underline">Update</button>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="Booking updates" sub="Confirmations, check-in reminders" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Trip alerts" sub="AI planner reschedules & timing nudges" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Offers & campaigns" sub="Seasonal deals, coupons" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Newsletter" sub="Monthly travel stories" right={<Toggle />} />
          </div>
        </SectionCard>

        <SectionCard title="Language & Region" icon={Globe}>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-subtle mb-1.5">App language</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                English (India)
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-1.5">Currency</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                ₹ Indian Rupee
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payments" icon={CreditCard}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={CreditCard}
              title="HDFC Credit Card"
              sub="•••• 4821 · default"
              right={<span className="text-xs text-muted">Primary</span>}
            />
            <SettingRow
              icon={CreditCard}
              title="UPI"
              sub="ananya@okhdfcbank"
              right={<button className="text-xs text-primary hover:underline">Manage</button>}
            />
          </div>
        </SectionCard>
      </div>

      {/* Danger zone */}
      <div className="border border-terracotta/30 bg-terracotta/5 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-terracotta/15 text-terracotta flex items-center justify-center">
            <Trash2 size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Delete account</p>
            <p className="text-xs text-muted">Removes your profile, bookings history and rewards permanently.</p>
          </div>
        </div>
        <button className="px-4 py-2 text-xs font-medium border border-terracotta/40 text-terracotta rounded-full hover:bg-terracotta hover:text-white transition-colors shrink-0">
          Delete
        </button>
      </div>
    </div>
  );
}
