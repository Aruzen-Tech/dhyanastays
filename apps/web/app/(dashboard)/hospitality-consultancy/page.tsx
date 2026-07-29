import Link from "next/link";
import {
  ClipboardList,
  PhoneCall,
  CheckCircle2,
  Clock,
  ArrowRight,
  Building,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// HOSPITALITY CONSULTANCY — Overview
// Owner listing requests → systematic pass →
// manager review call → approved for listing
// ============================================

const pipeline = [
  { stage: "Submitted", count: 7, cls: "bg-surface-hover text-muted" },
  { stage: "Systematic checks", count: 4, cls: "bg-primary/15 text-primary" },
  { stage: "Ready for review", count: 3, cls: "bg-sage/15 text-sage" },
  { stage: "Owner call scheduled", count: 2, cls: "bg-terracotta/15 text-terracotta" },
  { stage: "Approved · July", count: 6, cls: "bg-sage text-white" },
];

const todaysCalls = [
  { owner: "Lakshmi Narayanan", avatar: "https://i.pravatar.cc/150?img=32", property: "Lakeview Mud House · Yelagiri", time: "3:00 PM", phone: "+91 98431 20114" },
  { owner: "Joseph K.", avatar: "https://i.pravatar.cc/150?img=57", property: "Cardamom Estate Bungalow · Thekkady", time: "5:30 PM", phone: "+91 94470 88123" },
];

const recentlyApproved = [
  { property: "Palm Grove Pool Villa", place: "Pondicherry", date: "Jul 15", next: "Sent to Curated Inspection (M9)" },
  { property: "Silver Oak Homestead", place: "Coonoor", date: "Jul 11", next: "Inspection scheduled Jul 21" },
];

export default function HospitalityConsultancyPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Hospitality Consultancy Dashboard"
        subtitle="Welcome back, Rohan — 3 listing requests cleared the systematic pass and await your review call."
        action={{ label: "Open Requests", href: "/hospitality-consultancy/requests", icon: ClipboardList }}
      />

      <StatGrid
        stats={[
          { label: "New Requests · Week", value: "7", delta: "owners applying to list", icon: Building },
          { label: "In Systematic Checks", value: "4", delta: "auto-screening now", icon: ShieldCheck },
          { label: "Ready for Review", value: "3", delta: "call & approve", icon: PhoneCall },
          { label: "Approved · July", value: "6", delta: "passed to inspection", icon: CheckCircle2 },
        ]}
      />

      {/* Pipeline */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <p className="text-sm font-semibold text-foreground mb-1">Listing pipeline</p>
        <p className="text-xs text-muted mb-5">
          Owners submit with full property information → automated systematic checks → only clean files reach a manager → review call → approved for listing.
        </p>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {pipeline.map((p, i) => (
            <div key={p.stage} className="flex items-center gap-2 shrink-0">
              <div className={`rounded-xl px-4 py-3 text-center ${p.cls}`}>
                <p className="text-lg font-bold tabular-nums leading-none">{p.count}</p>
                <p className="text-[10px] font-medium mt-1 whitespace-nowrap">{p.stage}</p>
              </div>
              {i < pipeline.length - 1 && <ArrowRight size={14} className="text-subtle shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's calls */}
        <SectionCard title="Today's Owner Calls" icon={PhoneCall} action={{ label: "All reviews", href: "/hospitality-consultancy/reviews" }}>
          <ul className="divide-y divide-surface-hover">
            {todaysCalls.map((c) => (
              <li key={c.owner} className="flex items-center gap-3 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={c.avatar} alt={c.owner} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.owner}</p>
                  <p className="text-xs text-muted truncate">{c.property}</p>
                  <p className="text-[11px] text-primary tabular-nums mt-0.5">{c.time} · {c.phone}</p>
                </div>
                <a
                  href={`tel:${c.phone.replace(/\s/g, "")}`}
                  aria-label={`Call ${c.owner}`}
                  className="w-9 h-9 rounded-full bg-sage/15 text-sage flex items-center justify-center hover:bg-sage hover:text-white transition-colors shrink-0"
                >
                  <PhoneCall size={14} />
                </a>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Both files passed all systematic checks — approve on call to move them to listing.
          </p>
        </SectionCard>

        {/* Recently approved */}
        <SectionCard title="Recently Approved Units" icon={CheckCircle2}>
          <ul className="divide-y divide-surface-hover">
            {recentlyApproved.map((r) => (
              <li key={r.property} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{r.property}</p>
                  <StatusPill tone="sage">Approved {r.date}</StatusPill>
                </div>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                  <MapPin size={10} /> {r.place}
                </p>
                <p className="text-[11px] text-sage mt-1 flex items-center gap-1">
                  <Clock size={10} /> {r.next}
                </p>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-surface-hover">
            <Link href="/hospitality-consultancy/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
              Consultancy projects &amp; strategy work <ArrowRight size={12} />
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
