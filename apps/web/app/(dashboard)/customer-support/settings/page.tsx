import {
  Bot,
  Bell,
  PhoneCall,
  Database,
  ShieldCheck,
  Siren,
  CreditCard,
  Scale,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// CUSTOMER SUPPORT — Settings
// AI behaviour · recording · redirect rules
// ============================================

const redirectRules = [
  { icon: CreditCard, rule: "Payment disputes & chargebacks", action: "Call center · callback within 2h" },
  { icon: Scale, rule: "Legal / contract questions", action: "Call center · senior agent" },
  { icon: Siren, rule: "Anything safety or SOS related", action: "SOS Manager desk · instant" },
];

export default function SupportSettingsPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="AI behaviour, recording policy and the rules that decide which few chats become calls."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="AI Behaviour" icon={Bot}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Bot}
              title="AI answers first"
              sub="Chatbot handles every new conversation before any human"
              right={<Toggle on />}
            />
            <SettingRow
              icon={Bot}
              title="Auto-resolve confidence"
              sub="Close chats without review when confidence ≥ 90%"
              right={<span className="text-xs text-foreground font-semibold tabular-nums">90%</span>}
            />
            <SettingRow
              icon={Bot}
              title="AI actions allowed"
              sub="Reschedule bookings, issue coupons up to ₹1,000, send invoices"
              right={<button className="text-xs text-primary hover:underline">Edit scope</button>}
            />
            <SettingRow
              icon={Bell}
              title="Human review queue"
              sub="Sample 10% of AI-resolved chats for weekly audit"
              right={<Toggle on />}
            />
          </div>
        </SectionCard>

        <SectionCard title="Recording & Retention" icon={Database}>
          <div className="divide-y divide-surface-hover">
            <SettingRow
              icon={Database}
              title="Record all conversations"
              sub="Transcripts + AI process logs, no exceptions"
              right={<StatusPill tone="sage">Always on</StatusPill>}
            />
            <SettingRow
              icon={Database}
              title="Retention period"
              sub="Chats, logs and call notes kept for compliance"
              right={<span className="text-xs text-foreground font-semibold">24 months</span>}
            />
            <SettingRow
              icon={ShieldCheck}
              title="Attach transcript to call handoffs"
              sub="Call center sees the full chat before dialling"
              right={<Toggle on />}
            />
            <SettingRow
              icon={ShieldCheck}
              title="PII masking in exports"
              sub="Phone & card numbers masked in downloaded reports"
              right={<Toggle on />}
            />
          </div>
        </SectionCard>
      </div>

      {/* Redirect rules */}
      <SectionCard title="Call Center Redirect Rules" icon={PhoneCall} action={{ label: "Add rule", href: "/customer-support/settings" }}>
        <ul className="divide-y divide-surface-hover">
          {redirectRules.map((r) => (
            <li key={r.rule} className="flex items-center gap-4 px-5 py-4">
              <span className="w-9 h-9 rounded-lg bg-terracotta/10 text-terracotta flex items-center justify-center shrink-0">
                <r.icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.rule}</p>
                <p className="text-xs text-muted mt-0.5">{r.action}</p>
              </div>
              <button className="text-xs text-primary hover:underline shrink-0">Edit</button>
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          Everything not matching a rule stays with the chatbot. Rules are evaluated on every message, and each redirect is logged with its reason.
        </p>
      </SectionCard>

      {/* Call center line */}
      <div className="bg-surface border border-border rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <PhoneCall size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Call center line</p>
            <p className="text-xs text-muted">1800-369-DHYANA · 6 agents · 9 AM – 11 PM IST</p>
          </div>
        </div>
        <button className="text-xs text-primary hover:underline shrink-0">Manage roster</button>
      </div>
    </div>
  );
}
