"use client";

import { useState } from "react";
import {
  ClipboardList,
  PhoneCall,
  Bot,
  Check,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// CUSTOMER SUPPORT — Tickets & Escalations
// AI auto-creates tickets; call center queue is
// the small slice AI couldn't finish in chat.
// ============================================

const tickets = [
  { id: "TKT-2291", subject: "Refund not received · DHY-847291", guest: "Priya Sharma", source: "AI auto-created", opened: "Today 4:03 PM", status: "AI resolved", tone: "sage" as const },
  { id: "TKT-2290", subject: "GST invoice correction", guest: "Zoho Corp HR", source: "AI auto-created", opened: "Today 1:12 PM", status: "AI resolved", tone: "sage" as const },
  { id: "TKT-2289", subject: "Double charge on UPI", guest: "Rahul Nair", source: "Redirect rule · payments", opened: "Today 12:40 PM", status: "Call center", tone: "terracotta" as const },
  { id: "TKT-2287", subject: "Host unreachable before check-in", guest: "Sneha Reddy", source: "AI escalated", opened: "Yesterday", status: "Human chat", tone: "primary" as const },
  { id: "TKT-2284", subject: "Coupon not applying", guest: "Daniel M.", source: "AI auto-created", opened: "Yesterday", status: "AI resolved", tone: "sage" as const },
];

interface CallItem {
  id: string;
  guest: string;
  avatar: string;
  reason: string;
  slot: string;
  done: boolean;
}

const initialCalls: CallItem[] = [
  { id: "CB-101", guest: "Rahul Nair", avatar: "https://i.pravatar.cc/150?img=53", reason: "Payment dispute · double charge ₹9,000", slot: "Today · 2:30 PM", done: false },
  { id: "CB-102", guest: "Ishita & Dev", avatar: "https://i.pravatar.cc/150?img=36", reason: "Wedding booking modification · legal terms", slot: "Today · 5:00 PM", done: false },
  { id: "CB-100", guest: "Arvind Swamy", avatar: "https://i.pravatar.cc/150?img=51", reason: "Chargeback clarification with bank", slot: "Done · 11:20 AM", done: true },
];

export default function TicketsEscalationsPage() {
  const [calls, setCalls] = useState(initialCalls);
  const markDone = (id: string) =>
    setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, done: true } : c)));

  const pendingCalls = calls.filter((c) => !c.done).length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Tickets & Escalations"
        subtitle="AI files and closes most tickets itself — this is the audit trail plus the short call-center queue."
      />

      <StatGrid
        stats={[
          { label: "Open Tickets", value: "3", delta: "11 closed today", icon: ClipboardList },
          { label: "AI Auto-closed", value: "78%", delta: "of July tickets", icon: Bot },
          { label: "Call Queue", value: String(pendingCalls), delta: "payments & legal only", icon: PhoneCall },
          { label: "Complaints Open", value: "1", delta: "host unreachable", icon: AlertTriangle },
        ]}
      />

      {/* Call center queue — the few redirected calls */}
      <SectionCard title="Call Center Queue" icon={PhoneCall}>
        <ul className="divide-y divide-surface-hover">
          {calls.map((c) => (
            <li key={c.id} className={`flex items-center gap-4 px-5 py-4 ${c.done ? "opacity-60" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={c.avatar} alt={c.guest} className="w-10 h-10 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.guest}</p>
                <p className="text-xs text-muted truncate">{c.reason}</p>
                <p className="text-[11px] text-subtle mt-0.5 flex items-center gap-1">
                  <Clock size={9} /> {c.slot} · full AI transcript attached
                </p>
              </div>
              {c.done ? (
                <StatusPill tone="muted">Called back</StatusPill>
              ) : (
                <button
                  onClick={() => markDone(c.id)}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-[11px] font-semibold bg-sage text-white rounded-full hover:opacity-90 transition-opacity shrink-0"
                >
                  <Check size={11} /> Mark called back
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          Only payment disputes, legal matters and SOS handoffs reach this queue — everything else stays in the chatbot.
        </p>
      </SectionCard>

      {/* Ticket audit trail */}
      <SectionCard title="All Tickets · Audit Trail" icon={FileText}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[620px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                <th className="px-5 py-3 font-semibold">Ticket</th>
                <th className="px-3 py-3 font-semibold">Guest</th>
                <th className="px-3 py-3 font-semibold">Source</th>
                <th className="px-3 py-3 font-semibold">Opened</th>
                <th className="px-5 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-foreground font-medium">{t.subject}</p>
                    <p className="text-[11px] text-subtle">{t.id}</p>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{t.guest}</td>
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-1 text-xs text-muted whitespace-nowrap">
                      <Bot size={11} className="text-sage" /> {t.source}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{t.opened}</td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusPill tone={t.tone}>{t.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 pb-4 pt-2 text-[11px] text-subtle">
          Every ticket carries its chat transcript and AI process log — open any row for the complete record.
        </p>
      </SectionCard>
    </div>
  );
}
