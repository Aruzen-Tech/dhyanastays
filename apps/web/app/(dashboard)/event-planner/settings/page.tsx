import {
  Landmark,
  Bell,
  Users,
  MapPin,
  ShieldCheck,
  FileText,
  Briefcase,
  PartyPopper,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// EVENT PLANNER — Partner Settings
// ============================================

const team = [
  { name: "Sana Kapoor", role: "Owner · Lead planner", avatar: "https://i.pravatar.cc/150?img=47" },
  { name: "Farhan Ali", role: "Decor & production", avatar: "https://i.pravatar.cc/150?img=59" },
  { name: "Nithya Balan", role: "Client relations", avatar: "https://i.pravatar.cc/150?img=44" },
];

const areas = ["Auroville", "Pondicherry", "Chennai", "Kodaikanal", "Wayanad"];

export default function EventPlannerSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Partner Settings"
        subtitle="Business profile, payouts, team and notification rules for Sana Kapoor Events."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Business Profile" icon={Briefcase}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={PartyPopper}
              title="Sana Kapoor Events"
              sub="Weddings · Surprises · Corporate · since 2021"
              right={<StatusPill tone="sage">Verified partner</StatusPill>}
            />
            <SettingRow
              icon={FileText}
              title="GSTIN"
              sub="33AAQCS8817M1ZC · Tamil Nadu"
              right={<button className="text-xs text-primary hover:underline">Update</button>}
            />
          </div>
          <div className="px-5 pb-4 pt-1">
            <p className="text-xs text-subtle mb-2 flex items-center gap-1">
              <MapPin size={11} /> Service areas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <span key={a} className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted">
                  {a}
                </span>
              ))}
              <button className="text-xs px-3 py-1 rounded-full border border-dashed border-border text-subtle hover:text-foreground transition-colors">
                + Add area
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payout Account" icon={Landmark}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Landmark}
              title="Axis Bank · Current"
              sub="•••• 5521 · settles 3 days after each event"
              right={<StatusPill tone="sage">Verified</StatusPill>}
            />
            <SettingRow
              icon={FileText}
              title="Commission plan"
              sub="12% per booked event · invoiced monthly"
              right={<button className="text-xs text-primary hover:underline">View plan</button>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Team Members" icon={Users} action={{ label: "Invite", href: "/event-planner/settings" }}>
          <ul className="divide-y divide-surface-hover">
            {team.map((t) => (
              <li key={t.name} className="flex items-center gap-3 px-5 py-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
                <button className="text-xs text-primary hover:underline shrink-0">Manage</button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="New enquiry alerts" sub="SMS + WhatsApp, instant" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Consultation reminders" sub="30 min before each call" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Payout confirmations" sub="Email with settlement report" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Lead digest" sub="Weekly summary of funnel performance" right={<Toggle />} />
          </div>
        </SectionCard>
      </div>

      {/* Vacation mode */}
      <div className="border border-border bg-surface rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-surface-hover text-muted flex items-center justify-center">
            <ShieldCheck size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Vacation mode</p>
            <p className="text-xs text-muted">
              Pause new enquiries and hide your listings temporarily — confirmed events stay active.
            </p>
          </div>
        </div>
        <Toggle />
      </div>
    </div>
  );
}
