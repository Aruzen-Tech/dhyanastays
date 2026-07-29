"use client";

import { useState } from "react";
import {
  Bell,
  ShieldAlert,
  Clock,
  MapPin,
  Plus,
  Trash2,
  PhoneCall,
  Siren,
  MessageSquare,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, Toggle, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SOS MANAGER — Settings
// Emergency directory (managed here) · SLA · alerts
// ============================================

interface DirEntry {
  id: string;
  label: string;
  number: string;
  scope: string;
}

const initialDirectory: DirEntry[] = [
  { id: "d1", label: "Police control room", number: "100", scope: "All zones" },
  { id: "d2", label: "Ambulance (108 GVK)", number: "108", scope: "All zones" },
  { id: "d3", label: "Fire & rescue", number: "101", scope: "All zones" },
  { id: "d4", label: "PIMS Hospital ER", number: "+91 413 261 6700", scope: "Auroville / Pondy" },
  { id: "d5", label: "Auroville security", number: "+91 413 262 2121", scope: "Auroville" },
  { id: "d6", label: "Forest office (Munnar)", number: "+91 4865 231 587", scope: "Munnar treks" },
  { id: "d7", label: "Tourist helpline", number: "1363", scope: "All zones" },
];

export default function SosSettingsPage() {
  const [directory, setDirectory] = useState(initialDirectory);
  const remove = (id: string) => setDirectory((prev) => prev.filter((d) => d.id !== id));

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Emergency number directory, SLA targets and alert routing."
      />

      {/* Emergency directory — managed by the manager */}
      <SectionCard title="Emergency Number Directory" icon={ShieldAlert}>
        <ul className="divide-y divide-surface-hover">
          {directory.map((d) => (
            <li key={d.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-9 h-9 rounded-lg bg-terracotta/10 text-terracotta flex items-center justify-center shrink-0">
                <PhoneCall size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.label}</p>
                <p className="text-[11px] text-subtle">{d.scope}</p>
              </div>
              <span className="text-sm font-semibold text-primary tabular-nums shrink-0">{d.number}</span>
              <button
                onClick={() => remove(d.id)}
                aria-label={`Remove ${d.label}`}
                className="w-8 h-8 rounded-lg border border-border text-muted hover:text-terracotta hover:border-terracotta/50 flex items-center justify-center transition-colors shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-surface-hover">
          <input
            placeholder="Label — e.g. “Kodai Govt Hospital”"
            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
          />
          <input
            placeholder="Number"
            className="w-44 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
          />
          <button className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors shrink-0">
            <Plus size={13} /> Add number
          </button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          These numbers appear in Live Response, the guest SOS panel and auto-dial escalations. Only you can edit them.
        </p>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="SLA Targets" icon={Clock}>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            {[
              { label: "First response", value: "≤ 5 minutes" },
              { label: "Responder on scene", value: "≤ 20 minutes" },
              { label: "Escalate to L2", value: "5 min unanswered" },
              { label: "Medical → 108", value: "Immediate" },
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

        <SectionCard title="Alert Routing" icon={Siren}>
          <div className="divide-y divide-surface-hover">
            <SettingRow icon={Siren} title="Auto-assign nearest responder" sub="Based on live responder GPS" right={<Toggle on />} />
            <SettingRow icon={MapPin} title="Guest GPS tracking" sub="Starts only after guest raises SOS" right={<StatusPill tone="sage">Always on</StatusPill>} />
            <SettingRow icon={MessageSquare} title="Notify host on SOS" sub="SMS + app alert to property host" right={<Toggle on />} />
            <SettingRow icon={Bell} title="Admin escalation copy" sub="Email super admin on every L3" right={<Toggle on />} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
