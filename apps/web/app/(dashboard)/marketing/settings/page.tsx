import {
  Bell,
  ShieldCheck,
  Image as ImageIcon,
  Link2,
  Users,
  Megaphone,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// MARKETING — Settings
// Approval flow · brand kit · tracking defaults
// ============================================

export default function MarketingSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Approval rules, brand assets and tracking defaults for everything you publish."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Publishing Rules" icon={ShieldCheck}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={ShieldCheck}
              title="Admin approval for Homepage Spotlight"
              sub="National slot changes need one admin sign-off"
              right={<Toggle on />}
            />
            <SettingRow
              icon={Megaphone}
              title="Regional slots publish instantly"
              sub="Region-wise feeds go live without review"
              right={<Toggle on />}
            />
            <SettingRow
              icon={ImageIcon}
              title="Auto-resize creatives"
              sub="Posters cropped per placement automatically"
              right={<Toggle on />}
            />
          </div>
        </SectionCard>

        <SectionCard title="Tracking Defaults" icon={Link2}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Link2}
              title="UTM tagging"
              sub="source=dhyana-app · medium=placement · campaign=name"
              right={<StatusPill tone="sage">Auto</StatusPill>}
            />
            <SettingRow
              icon={Link2}
              title="Conversion window"
              sub="Bookings credited to a campaign within"
              right={<span className="text-xs text-foreground font-semibold">7 days</span>}
            />
          </div>
        </SectionCard>

        <SectionCard title="Brand Kit" icon={ImageIcon}>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Logo pack (SVG + PNG)</span>
              <button className="text-xs text-primary hover:underline">Download</button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Palette — Levitation Green #10B981 · Leaf #4ADE80 · Deep Forest</span>
              <button className="text-xs text-primary hover:underline">Copy tokens</button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Fonts — Playfair Display · Inter</span>
              <button className="text-xs text-primary hover:underline">Usage guide</button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Bell} title="Campaign go-live alerts" sub="When scheduled campaigns start" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Fallback alerts" sub="When a slot drops to AI suggestions" right={<Toggle on />} />
            <SettingRow icon={Users} title="Weekly performance digest" sub="Monday 9 AM to the growth team" right={<Toggle on />} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
