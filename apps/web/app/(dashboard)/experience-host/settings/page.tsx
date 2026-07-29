import {
  Landmark,
  Bell,
  MapPin,
  ShieldCheck,
  FileText,
  Camera,
  Clock,
  Users,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// EXPERIENCE HOST — Settings
// ============================================

const areas = ["Auroville", "Pondicherry", "Kodaikanal", "Munnar", "Wayanad", "Coorg"];

export default function ExperienceHostSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Profile, payouts, availability and notifications for your experiences."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Host Profile" icon={Camera}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Camera}
              title="Karthik Iyer Experiences"
              sub="Wellness · Photography · Nature · since 2022"
              right={<StatusPill tone="sage">Verified host</StatusPill>}
            />
            <SettingRow
              icon={ShieldCheck}
              title="Identity verification"
              sub="Aadhaar + certified guide licence"
              right={<span className="text-xs text-sage font-medium">Verified</span>}
            />
          </div>
          <div className="px-5 pb-4 pt-1">
            <p className="text-xs text-subtle mb-2 flex items-center gap-1">
              <MapPin size={11} /> Operating locations
            </p>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <span key={a} className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payout Account" icon={Landmark}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Landmark}
              title="SBI · Savings"
              sub="•••• 2210 · payouts every Monday"
              right={<StatusPill tone="sage">Verified</StatusPill>}
            />
            <SettingRow
              icon={FileText}
              title="Commission plan"
              sub="10% per booking · GST invoice monthly"
              right={<button className="text-xs text-primary hover:underline">View plan</button>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Availability Defaults" icon={Clock}>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-subtle mb-1.5">Advance booking window</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                Up to 60 days ahead
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-1.5">Cut-off before session</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                6 hours
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-1.5">Weekly day off</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                Tuesday
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-1.5">Group size cap</p>
              <div className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground">
                15 guests
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="New booking requests" sub="SMS + WhatsApp, instant" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Session reminders" sub="Evening before each session" right={<Toggle on />} />
            <SettingRow icon={Bell} title="New reviews" sub="Push when a guest rates you" right={<Toggle on />} />
            <SettingRow icon={Users} title="Waitlist alerts" sub="When a full session gets cancellations" right={<Toggle />} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
