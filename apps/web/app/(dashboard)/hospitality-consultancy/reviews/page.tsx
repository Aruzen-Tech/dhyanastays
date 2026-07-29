"use client";

import { useState } from "react";
import {
  PhoneCall,
  CheckCircle2,
  Clock,
  MapPin,
  Check,
  RefreshCw,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// HOSPITALITY CONSULTANCY — Reviews & Calls
// Manager reviews cleared files, calls owners,
// approves units for listing.
// ============================================

type ReviewStatus = "Call scheduled" | "Approved" | "Changes requested";

interface ReviewItem {
  id: string;
  owner: string;
  avatar: string;
  phone: string;
  property: string;
  place: string;
  slot: string;
  status: ReviewStatus;
}

const initialReviews: ReviewItem[] = [
  { id: "REQ-118", owner: "Lakshmi Narayanan", avatar: "https://i.pravatar.cc/150?img=32", phone: "+91 98431 20114", property: "Lakeview Mud House", place: "Yelagiri", slot: "Today · 3:00 PM", status: "Call scheduled" },
  { id: "REQ-121", owner: "Joseph K.", avatar: "https://i.pravatar.cc/150?img=57", phone: "+91 94470 88123", property: "Cardamom Estate Bungalow", place: "Thekkady", slot: "Today · 5:30 PM", status: "Call scheduled" },
  { id: "REQ-115", owner: "Farida Begum", avatar: "https://i.pravatar.cc/150?img=29", phone: "+91 99400 76211", property: "Bay Breeze Homestay", place: "Mahabalipuram", slot: "Called Jul 16", status: "Changes requested" },
];

const callChecklist = [
  "Confirm owner identity & intent to host long-term",
  "Walk through commission plan and exclusivity terms",
  "Align on pricing band & seasonal strategy",
  "Explain Curated Inspection (Module 9) and timeline",
  "Confirm go-live readiness: staff, housekeeping, safety",
];

const approvedLog = [
  { property: "Palm Grove Pool Villa", owner: "R. Subramaniam", date: "Jul 15", note: "Sent to Curated Inspection" },
  { property: "Silver Oak Homestead", owner: "Grace Thomas", date: "Jul 11", note: "Inspection Jul 21 · host onboarding started" },
  { property: "Mango Orchard Farmstay", owner: "K. Perumal", date: "Jul 04", note: "Live since Jul 14 · first booking received" },
];

export default function ReviewsCallsPage() {
  const [reviews, setReviews] = useState(initialReviews);
  const setStatus = (id: string, status: ReviewStatus) =>
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const pending = reviews.filter((r) => r.status === "Call scheduled").length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Reviews & Calls"
        subtitle="Files that cleared the systematic pass — review, call the owner, and approve the unit for listing."
      />

      <StatGrid
        stats={[
          { label: "Calls Pending", value: String(pending), delta: "both today", icon: PhoneCall },
          { label: "Approved · July", value: "6", delta: "→ Curated Inspection", icon: CheckCircle2 },
          { label: "Changes Requested", value: "2", delta: "owners resubmitting", icon: RefreshCw },
          { label: "Avg Request → Approval", value: "4.2 days", delta: "incl. owner call", icon: Clock },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Review queue */}
        <SectionCard title="Owner Review Calls" icon={PhoneCall} className="lg:col-span-2">
          <ul className="divide-y divide-surface-hover">
            {reviews.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={r.avatar} alt={r.owner} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {r.property} <span className="text-subtle font-normal">· {r.id}</span>
                    </p>
                    <p className="text-xs text-muted flex items-center gap-1 truncate">
                      {r.owner} · <MapPin size={10} /> {r.place}
                    </p>
                    <p className="text-[11px] text-primary tabular-nums mt-0.5">{r.slot} · {r.phone}</p>
                  </div>
                  <StatusPill
                    tone={r.status === "Approved" ? "sage" : r.status === "Changes requested" ? "terracotta" : "primary"}
                  >
                    {r.status}
                  </StatusPill>
                </div>
                {r.status === "Call scheduled" && (
                  <div className="flex flex-wrap gap-2 mt-3 pl-14">
                    <a
                      href={`tel:${r.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
                    >
                      <PhoneCall size={11} /> Call now
                    </a>
                    <button
                      onClick={() => setStatus(r.id, "Approved")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold bg-sage text-white rounded-full hover:opacity-90 transition-opacity"
                    >
                      <Check size={11} /> Approve for listing
                    </button>
                    <button
                      onClick={() => setStatus(r.id, "Changes requested")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-medium border border-border text-muted rounded-full hover:text-terracotta hover:border-terracotta/50 transition-colors"
                    >
                      <RefreshCw size={11} /> Request changes
                    </button>
                  </div>
                )}
                {r.status === "Approved" && (
                  <p className="text-[11px] text-sage mt-2 pl-14 flex items-center gap-1">
                    <ShieldCheck size={11} /> Approved — unit passed to Curated Inspection (Module 9), owner notified.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Call checklist */}
        <SectionCard title="On-call Checklist" icon={ClipboardList}>
          <ul className="px-5 py-4 space-y-3">
            {callChecklist.map((c) => (
              <li key={c} className="flex gap-2.5 text-xs text-muted leading-relaxed">
                <Check size={13} className="text-sage shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Calls are recorded and attached to the request file along with your decision.
          </p>
        </SectionCard>
      </div>

      {/* Approved log */}
      <SectionCard title="Approval Log" icon={CheckCircle2}>
        <ul className="divide-y divide-surface-hover">
          {approvedLog.map((a) => (
            <li key={a.property} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.property}</p>
                <p className="text-xs text-muted">{a.owner} · approved {a.date}</p>
              </div>
              <span className="text-[11px] text-sage">{a.note}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
