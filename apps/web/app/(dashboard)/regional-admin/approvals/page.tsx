"use client";

import { useState } from "react";
import {
  Home,
  Building,
  Check,
  X,
  AlertTriangle,
  UserCog,
  ClipboardList,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// REGIONAL ADMIN — Approvals & Assignments
// Approve hosts/properties within the region,
// assign Super Hosts/Hosts to properties, and
// resolve escalations routed from Support.
// ============================================

type Status = "Pending" | "Approved" | "Rejected";

interface Approval {
  id: string;
  type: "Host" | "Property";
  name: string;
  region: string;
  submitted: string;
  status: Status;
}

const initialApprovals: Approval[] = [
  { id: "ap1", type: "Host", name: "Karuna Homestays", region: "Pondicherry", submitted: "Jul 18", status: "Pending" },
  { id: "ap2", type: "Property", name: "Palmyra Farm Cottage", region: "Auroville", submitted: "Jul 17", status: "Pending" },
  { id: "ap3", type: "Host", name: "Coastal Roots Stays", region: "Cuddalore", submitted: "Jul 16", status: "Pending" },
  { id: "ap4", type: "Property", name: "Nila Wellness Retreat — Room 3", region: "Palakkad", submitted: "Jul 15", status: "Pending" },
  { id: "ap5", type: "Host", name: "Bay Breeze Villas", region: "ECR", submitted: "Jul 12", status: "Approved" },
  { id: "ap6", type: "Property", name: "Stone Valley Villa — Annex", region: "Yelagiri", submitted: "Jul 10", status: "Rejected" },
];

const superHosts = ["Rahul Verma (South Cluster)", "Divya Krishnan (Regional Host — TN)", "Unassigned"];

const escalations = [
  { id: "es1", issue: "Guest refund dispute — Stone Valley Villa", severity: "High" as const, sla: "2h left", assignee: "CA Neha Gupta" },
  { id: "es2", issue: "Host unresponsive 24h — Palmyra Farm Cottage", severity: "Medium" as const, sla: "1d left", assignee: "Rohan Das" },
];

const filters = ["All", "Pending", "Approved", "Rejected"] as const;

export default function RegionalAdminApprovalsPage() {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Pending");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [resolved, setResolved] = useState<string[]>([]);

  const setStatus = (id: string, status: Status) =>
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));

  const visible = approvals.filter((a) => filter === "All" || a.status === filter);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Approvals & Assignments"
        subtitle="Approve hosts and properties in your region, then assign a Super Host to manage them."
      />

      <SectionCard title="Host & Property Approvals" icon={ClipboardList}>
        <div className="px-5 pt-4 flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-surface-hover mt-4">
          {visible.map((a) => (
            <li key={a.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {a.type === "Host" ? <Home size={15} /> : <Building size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-subtle">{a.type} · {a.region} · submitted {a.submitted}</p>
                  </div>
                </div>
                <StatusPill tone={a.status === "Approved" ? "sage" : a.status === "Rejected" ? "terracotta" : "primary"}>
                  {a.status}
                </StatusPill>
              </div>

              {a.status === "Pending" && (
                <div className="flex items-center gap-2 mt-3 ml-12">
                  <button
                    onClick={() => setStatus(a.id, "Approved")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-sage text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => setStatus(a.id, "Rejected")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-border rounded-full text-muted hover:text-terracotta hover:border-terracotta/40 transition-colors"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              )}

              {a.status === "Approved" && (
                <div className="flex items-center gap-2 mt-3 ml-12">
                  <UserCog size={13} className="text-subtle" />
                  <select
                    value={assignments[a.id] ?? ""}
                    onChange={(e) => setAssignments((p) => ({ ...p, [a.id]: e.target.value }))}
                    className="text-xs px-3 py-1.5 rounded-full bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Assign to Super Host…</option>
                    {superHosts.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {assignments[a.id] && (
                    <span className="text-[11px] text-sage">Assigned to {assignments[a.id]}</span>
                  )}
                </div>
              )}
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-subtle">Nothing in this filter.</li>
          )}
        </ul>
      </SectionCard>

      <SectionCard title="Escalations" icon={AlertTriangle}>
        <ul className="divide-y divide-surface-hover">
          {escalations.map((e) => {
            const isResolved = resolved.includes(e.id);
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{e.issue}</p>
                  <p className="text-xs text-subtle mt-0.5">Assigned to {e.assignee}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill tone={isResolved ? "sage" : e.severity === "High" ? "terracotta" : "primary"}>
                    {isResolved ? "Resolved" : `${e.severity} · ${e.sla}`}
                  </StatusPill>
                  {!isResolved && (
                    <button
                      onClick={() => setResolved((p) => [...p, e.id])}
                      className="px-3 py-1.5 text-xs font-medium border border-border rounded-full text-muted hover:text-sage hover:border-sage/40 transition-colors"
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}
