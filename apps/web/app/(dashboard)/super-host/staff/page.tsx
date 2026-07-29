"use client";

import { useState } from "react";
import {
  Users,
  ShieldCheck,
  Star,
  ClipboardList,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill, Toggle } from "@/app/components/DashboardUI";

// ============================================
// SUPER HOST — Staff & Quality
// Team performance across the cluster + the
// quality standards every property must pass.
// ============================================

const staff = [
  { name: "Divya Krishnan", role: "Regional Host", region: "Tamil Nadu", properties: 24, rating: 4.8, status: "Active" },
  { name: "Suresh Babu", role: "Host", region: "ECR", properties: 3, rating: 4.6, status: "Active" },
  { name: "Karuna Homestays", role: "Host", region: "Pondicherry", properties: 1, rating: "—", status: "Onboarding" },
  { name: "Regional Team KL", role: "Regional Host", region: "Kerala", properties: 6, rating: 4.9, status: "Active" },
  { name: "Regional Team KA", role: "Regional Host", region: "Karnataka", properties: 5, rating: 4.7, status: "Active" },
];

const initialChecks = [
  { id: "c1", label: "Land / ownership papers verified", on: true },
  { id: "c2", label: "Photo & video quality meets brand standard", on: true },
  { id: "c3", label: "Location & accessibility confirmed", on: true },
  { id: "c4", label: "Category & amenity accuracy checked", on: true },
  { id: "c5", label: "Pricing within regional benchmark", on: false },
];

const tickets = [
  { id: "t1", text: "Guest complaint — AC not working, Bay Breeze Villas", priority: "High" as const },
  { id: "t2", text: "Host training request — new pricing tool", priority: "Low" as const },
];

export default function SuperHostStaffPage() {
  const [checks, setChecks] = useState(initialChecks);

  const toggleCheck = (id: string) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, on: !c.on } : c)));

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Staff & Quality"
        subtitle="Team performance across the cluster and the systematic checks every property must pass."
      />

      <SectionCard title="Team Performance" icon={Users}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-surface-hover">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Region</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Properties</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Rating</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.name} className="border-b border-surface-hover last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-subtle">{s.role}</p>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{s.region}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground text-xs">{s.properties}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {s.rating === "—" ? (
                      <span className="text-subtle">—</span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-foreground font-medium">
                        <Star size={11} className="text-primary fill-primary" /> {s.rating}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill tone={s.status === "Active" ? "sage" : "primary"}>{s.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Cluster-wide Quality Standards" icon={ShieldCheck}>
          <div className="divide-y divide-surface-hover">
            {checks.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <p className="text-sm text-foreground">{c.label}</p>
                <button onClick={() => toggleCheck(c.id)} aria-label={`Toggle ${c.label}`}>
                  <Toggle on={c.on} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Host Support Tickets" icon={ClipboardList}>
          <ul className="divide-y divide-surface-hover">
            {tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <p className="text-xs text-foreground">{t.text}</p>
                <StatusPill tone={t.priority === "High" ? "terracotta" : "muted"}>{t.priority}</StatusPill>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
