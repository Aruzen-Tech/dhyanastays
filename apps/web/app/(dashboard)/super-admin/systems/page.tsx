"use client";

import { useState } from "react";
import {
  Database,
  Zap,
  Activity,
  Bot,
  RefreshCw,
  Check,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill, SettingRow, Toggle } from "@/app/components/DashboardUI";

// ============================================
// SUPER ADMIN — Systems & AI
// Third-party integrations, live system health,
// AI behaviour controls, backup & recovery.
// ============================================

const integrations = [
  { id: "i1", name: "Razorpay", desc: "Payment gateway", status: "Connected" },
  { id: "i2", name: "RazorpayX", desc: "Automated payouts", status: "Connected" },
  { id: "i3", name: "WhatsApp Business API", desc: "Concierge & support messaging", status: "Connected" },
  { id: "i4", name: "Maps / GPS", desc: "SOS live tracking", status: "Mock mode" },
];

const services = [
  { id: "s1", name: "Booking Engine", status: "Operational" },
  { id: "s2", name: "AI Trip Planner", status: "Operational" },
  { id: "s3", name: "Payments & Payouts", status: "Operational" },
  { id: "s4", name: "SOS Live Tracking", status: "Operational" },
  { id: "s5", name: "Notification Service", status: "Degraded" },
];

export default function SuperAdminSystemsPage() {
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState("Today, 03:00 AM");

  const runBackup = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      setLastBackup("Just now");
    }, 1800);
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Systems & AI"
        subtitle="Integrations, live system health, AI behaviour and backups — the platform's plumbing."
      />

      <SectionCard title="Integrations" icon={Zap}>
        <ul className="divide-y divide-surface-hover">
          {integrations.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">{i.name}</p>
                <p className="text-xs text-subtle">{i.desc}</p>
              </div>
              <StatusPill tone={i.status === "Connected" ? "sage" : "primary"}>{i.status}</StatusPill>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="System Health" icon={Activity}>
        <ul className="divide-y divide-surface-hover">
          {services.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-sm text-foreground">{s.name}</p>
              <StatusPill tone={s.status === "Operational" ? "sage" : "terracotta"}>{s.status}</StatusPill>
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover">99.98% uptime over the last 30 days.</p>
      </SectionCard>

      <SectionCard title="AI Settings" icon={Bot}>
        <div className="divide-y divide-surface-hover">
          <SettingRow icon={Bot} title="AI-first customer support" sub="Route new chats to AI before human agents" right={<Toggle on />} />
          <SettingRow icon={Bot} title="AI trip planner auto-reschedule" sub="Adjusts itinerary when guest runs late" right={<Toggle on />} />
          <SettingRow icon={Bot} title="AI dynamic repricing" sub="Suggests price changes to hosts, opt-in per host" right={<Toggle on={false} />} />
        </div>
      </SectionCard>

      <SectionCard title="Backup & Recovery" icon={Database}>
        <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-foreground">Last full backup</p>
            <p className="text-xs text-muted mt-0.5">{lastBackup} · all regions</p>
          </div>
          <button
            onClick={runBackup}
            disabled={backingUp}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {backingUp ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            {backingUp ? "Backing up…" : "Run backup now"}
          </button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-subtle">Automated backups run nightly at 3 AM IST, retained 90 days.</p>
      </SectionCard>
    </div>
  );
}
