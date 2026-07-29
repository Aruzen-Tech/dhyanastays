"use client";

import { useState } from "react";
import {
  Lock,
  Users,
  ClipboardList,
  UserPlus,
  X,
  KeyRound,
} from "lucide-react";
import { PageHeader, SectionCard, SettingRow, StatusPill, Toggle } from "@/app/components/DashboardUI";

// ============================================
// SUPER ADMIN — Security & Access
// Add/remove admins & partners, enforce security
// policy, and read the platform-wide audit log.
// ============================================

type RoleKind = "Admin" | "Super Host" | "Host" | "Investor" | "Partner";

interface Member {
  id: string;
  name: string;
  role: RoleKind;
  scope: string;
}

const initialMembers: Member[] = [
  { id: "m1", name: "Meera Chandran", role: "Admin", scope: "Tamil Nadu · Pondicherry" },
  { id: "m2", name: "Rahul Verma", role: "Super Host", scope: "South Cluster · 5 regions" },
  { id: "m3", name: "Vikram Patel", role: "Host", scope: "3 properties" },
  { id: "m4", name: "Navin Kumar", role: "Investor", scope: "₹1.2Cr committed" },
  { id: "m5", name: "Aditya Sharma", role: "Partner", scope: "Marketing Lead" },
];

const roleKinds: RoleKind[] = ["Admin", "Super Host", "Host", "Investor", "Partner"];

const auditLog = [
  { id: "l1", who: "CA Neha Gupta", action: "Approved payout batch #4821", time: "2 min ago" },
  { id: "l2", who: "Root Access", action: "Rolled out flag ai-concierge-v2 to 25%", time: "18 min ago" },
  { id: "l3", who: "Meera Chandran", action: "Approved host — Karuna Homestays", time: "41 min ago" },
  { id: "l4", who: "System", action: "Blocked login — unrecognised device, Chennai IP", time: "1h ago" },
  { id: "l5", who: "Rahul Verma", action: "Updated pricing rule — South Cluster", time: "2h ago" },
  { id: "l6", who: "Priya Nair", action: "Escalated ticket #2291 to Regional Admin", time: "3h ago" },
];

export default function SuperAdminSecurityPage() {
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleKind>("Admin");
  const [search, setSearch] = useState("");

  const addMember = () => {
    if (!name.trim()) return;
    setMembers((prev) => [{ id: `m${Date.now()}`, name: name.trim(), role, scope: "Newly added" }, ...prev]);
    setName("");
  };

  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id));

  const visibleLog = auditLog.filter(
    (l) => l.who.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Security & Access"
        subtitle="Add or remove admins, super hosts, hosts, investors and partners — and read every action on record."
      />

      <SectionCard title="Security Policy" icon={Lock}>
        <div className="divide-y divide-surface-hover">
          <SettingRow
            icon={KeyRound}
            title="2FA required for all admin roles"
            sub="Admin, Super Host and Finance access require a second factor"
            right={<Toggle on />}
          />
          <SettingRow
            icon={Lock}
            title="Hardware key for Super Admin & Finance"
            sub="Root-level access requires a physical security key"
            right={<Toggle on />}
          />
          <SettingRow
            icon={ClipboardList}
            title="Session timeout"
            sub="Auto sign-out after inactivity"
            right={<span className="text-xs text-foreground font-semibold">30 min</span>}
          />
        </div>
      </SectionCard>

      <SectionCard title="Team & Role Assignments" icon={Users}>
        <div className="px-5 pt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleKind)}
            className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {roleKinds.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={addMember}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors whitespace-nowrap"
          >
            <UserPlus size={15} /> Add
          </button>
        </div>

        <ul className="divide-y divide-surface-hover mt-4">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                <p className="text-xs text-subtle">{m.scope}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusPill tone="muted">{m.role}</StatusPill>
                <button
                  onClick={() => removeMember(m.id)}
                  aria-label={`Remove ${m.name}`}
                  className="p-1.5 rounded-full text-subtle hover:text-terracotta hover:bg-terracotta/10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Audit Logs" icon={ClipboardList}>
        <div className="px-5 pt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by person or action…"
            className="w-full max-w-sm px-4 py-2 rounded-full bg-background border border-border text-xs text-foreground placeholder-subtle focus:outline-none focus:border-primary"
          />
        </div>
        <ul className="divide-y divide-surface-hover mt-3">
          {visibleLog.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <p className="text-xs text-muted">
                <span className="text-foreground font-medium">{l.who}</span> — {l.action}
              </p>
              <span className="text-[10px] text-subtle shrink-0 whitespace-nowrap">{l.time}</span>
            </li>
          ))}
          {visibleLog.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-subtle">No matching events.</li>
          )}
        </ul>
        <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover">Retained 24 months · exportable as CSV.</p>
      </SectionCard>
    </div>
  );
}
