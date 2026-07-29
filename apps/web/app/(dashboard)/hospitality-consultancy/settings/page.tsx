import {
  ShieldCheck,
  Bell,
  Clock,
  FileText,
  Camera,
  MapPin,
  Home,
  IndianRupee,
  Users,
  PhoneCall,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// HOSPITALITY CONSULTANCY — Settings
// Systematic pass rules · call SLAs · team
// ============================================

const checks = [
  { icon: FileText, label: "Land & ownership papers", desc: "Deed / patta verified against owner ID", mandatory: true },
  { icon: Camera, label: "Photo quality", desc: "Minimum 8 photos · 1920×1080 · no heavy filters", mandatory: true },
  { icon: MapPin, label: "Location serviceable", desc: "Within an active region with responder & delivery coverage", mandatory: true },
  { icon: Home, label: "Category & concept fit", desc: "Matches a curated category — no party-first properties", mandatory: true },
  { icon: IndianRupee, label: "Pricing viability", desc: "Proposed rate within band for category & region", mandatory: false },
];

const team = [
  { name: "Rohan Das", role: "Hospitality Lead · final approvals", avatar: "https://i.pravatar.cc/150?img=12" },
  { name: "Ankita Rao", role: "Request screening & owner calls", avatar: "https://i.pravatar.cc/150?img=35" },
  { name: "M. Krishnan", role: "Regional liaison · TN & Kerala", avatar: "https://i.pravatar.cc/150?img=69" },
];

export default function ConsultancySettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="The systematic pass rules, call SLAs and your review team."
      />

      {/* Systematic pass rules */}
      <SectionCard title="Systematic Pass — Checks" icon={ShieldCheck} action={{ label: "Add check", href: "/hospitality-consultancy/settings" }}>
        <ul className="divide-y divide-surface-hover">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-4 px-5 py-4">
              <span className="w-9 h-9 rounded-lg bg-sage/10 text-sage flex items-center justify-center shrink-0">
                <c.icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted mt-0.5">{c.desc}</p>
              </div>
              {c.mandatory ? (
                <StatusPill tone="sage">Mandatory</StatusPill>
              ) : (
                <StatusPill tone="muted">Advisory</StatusPill>
              )}
              <Toggle on />
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          A request reaches a manager only when every mandatory check passes. Failed checks auto-notify the owner with the reason and a resubmission link.
        </p>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Review & Call SLAs" icon={Clock}>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            {[
              { label: "Systematic pass runtime", value: "≤ 24 hours" },
              { label: "Review call scheduled within", value: "2 business days" },
              { label: "Decision after call", value: "Same day" },
              { label: "Resubmission window", value: "14 days" },
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

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="New request alerts" sub="When a submission enters the pipeline" right={<Toggle on />} />
            <SettingRow icon={ShieldCheck} title="Checks-cleared alerts" sub="When a file is ready for your call" right={<Toggle on />} />
            <SettingRow icon={PhoneCall} title="Call reminders" sub="30 min before each owner call" right={<Toggle on />} />
            <SettingRow icon={FileText} title="Weekly pipeline digest" sub="Every Monday 9 AM" right={<Toggle />} />
          </div>
        </SectionCard>
      </div>

      {/* Team */}
      <SectionCard title="Review Team" icon={Users} action={{ label: "Invite", href: "/hospitality-consultancy/settings" }}>
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
    </div>
  );
}
