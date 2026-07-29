"use client";

import { useState } from "react";
import {
  Users,
  PhoneCall,
  Plus,
  AlertTriangle,
  ShieldAlert,
  Clock,
  MapPin,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SOS MANAGER — Teams & Escalation
// Roster with numbers (managed by the manager),
// escalation matrix, escalation history
// ============================================

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  zone: string;
  phone: string;
  onDuty: boolean;
}

const initialTeam: Member[] = [
  { id: "m1", name: "Arjun Kumar (R1)", avatar: "https://i.pravatar.cc/150?img=52", role: "Field responder", zone: "Auroville / ECR", phone: "+91 98407 11223", onDuty: true },
  { id: "m2", name: "Divya Prasad (R2)", avatar: "https://i.pravatar.cc/150?img=43", role: "Field responder", zone: "Kodaikanal", phone: "+91 94861 44770", onDuty: true },
  { id: "m3", name: "Dr. Nisha Verma", avatar: "https://i.pravatar.cc/150?img=26", role: "Medical liaison", zone: "Remote · 24×7", phone: "+91 98940 20981", onDuty: true },
  { id: "m4", name: "Karthik Selvam (R3)", avatar: "https://i.pravatar.cc/150?img=64", role: "Field responder", zone: "Wayanad", phone: "+91 90030 87654", onDuty: false },
  { id: "m5", name: "Fathima Rizwan", avatar: "https://i.pravatar.cc/150?img=16", role: "Night dispatcher", zone: "Control room", phone: "+91 87540 33219", onDuty: false },
];

const escalationMatrix = [
  { level: "L1 · Field responder", window: "0 – 5 min", contact: "Zone responder on duty", number: "Auto-assigned", tone: "sage" as const },
  { level: "L2 · SOS Manager", window: "> 5 min unanswered", contact: "Maj. Arjun Singh", number: "+91 98400 10001", tone: "primary" as const },
  { level: "L3 · Emergency services", window: "Immediate for medical/fire", contact: "108 / 100 / 101", number: "Auto-dialled + location shared", tone: "terracotta" as const },
];

const history = [
  { id: "SOS-0142", note: "Medical · escalated to L3 (108) in 2 min — ambulance reached in 16 min", when: "Jul 16", level: "L3" },
  { id: "SOS-0138", note: "Safety check · L1 resolved on call, no field visit needed", when: "Jul 11", level: "L1" },
  { id: "SOS-0134", note: "Lost route · L2 coordinated with forest office", when: "Jul 06", level: "L2" },
];

export default function SosTeamsPage() {
  const [team, setTeam] = useState(initialTeam);
  const toggleDuty = (id: string) =>
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, onDuty: !m.onDuty } : m)));

  const onDutyCount = team.filter((m) => m.onDuty).length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Teams & Escalation"
        subtitle="Your response roster with contact numbers, the escalation matrix and past escalations."
        action={{ label: "Add Member", href: "/sos-manager/teams", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Team Members", value: String(team.length), delta: "3 zones covered", icon: Users },
          { label: "On Duty Now", value: String(onDutyCount), delta: "tap a row to change", icon: Clock },
          { label: "Avg Assignment Time", value: "1m 40s", delta: "alert → responder" },
          { label: "Escalations · July", value: "4", delta: "1 to emergency services", icon: AlertTriangle },
        ]}
      />

      {/* Roster — numbers listed, duty toggle works */}
      <SectionCard title="Response Team Roster" icon={Users}>
        <ul className="divide-y divide-surface-hover">
          {team.map((m) => (
            <li key={m.id} className="flex items-center gap-4 px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={m.avatar} alt={m.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                <p className="text-xs text-muted flex items-center gap-1 truncate">
                  {m.role} · <MapPin size={10} className="shrink-0" /> {m.zone}
                </p>
                <p className="text-xs font-semibold text-primary tabular-nums mt-0.5">{m.phone}</p>
              </div>
              <button
                onClick={() => toggleDuty(m.id)}
                className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-full transition-colors shrink-0 ${
                  m.onDuty
                    ? "bg-sage/15 text-sage hover:bg-sage hover:text-white"
                    : "bg-surface-hover text-subtle hover:text-foreground"
                }`}
              >
                {m.onDuty ? "On duty" : "Off duty"}
              </button>
              <a
                href={`tel:${m.phone.replace(/\s/g, "")}`}
                aria-label={`Call ${m.name}`}
                className="w-9 h-9 rounded-full bg-sage/15 text-sage flex items-center justify-center hover:bg-sage hover:text-white transition-colors shrink-0"
              >
                <PhoneCall size={14} />
              </a>
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          Numbers are listed and maintained by you — they appear in Live Response and are auto-dialled during escalations.
        </p>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Escalation matrix */}
        <SectionCard title="Escalation Matrix" icon={ShieldAlert}>
          <ul className="divide-y divide-surface-hover">
            {escalationMatrix.map((l) => (
              <li key={l.level} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{l.level}</p>
                  <StatusPill tone={l.tone}>{l.window}</StatusPill>
                </div>
                <p className="text-xs text-muted mt-1">{l.contact}</p>
                <p className="text-xs font-semibold text-primary tabular-nums mt-0.5">{l.number}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Escalation history */}
        <SectionCard title="Escalation History" icon={AlertTriangle}>
          <ul className="divide-y divide-surface-hover">
            {history.map((h) => (
              <li key={h.id} className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{h.id}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{h.level}</span>
                  <span className="text-[10px] text-subtle ml-auto">{h.when}</span>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">{h.note}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
