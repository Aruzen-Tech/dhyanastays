"use client";

import { useState } from "react";
import {
  MessageSquare,
  Phone,
  Mail,
  Clock,
  CalendarDays,
  Users,
  Video,
  Star,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// EVENT PLANNER — Contact Management
// Enquiries inbox · consultations · directory
// ============================================

const filters = ["All", "New", "Replied", "Scheduled"] as const;
type Filter = (typeof filters)[number];

const enquiries = [
  { name: "Kavya Pillai", avatar: "https://i.pravatar.cc/150?img=31", type: "Wedding", note: "Beach wedding for 120 guests, Dec 2026 — budget ₹6L. Wants venue options this week.", time: "18 min ago", state: "New" as Filter, tone: "terracotta" as const },
  { name: "Arvind Swamy", avatar: "https://i.pravatar.cc/150?img=51", type: "Birthday", note: "Anniversary surprise at a tiny house, Aug 14 — candlelight + private chef.", time: "2 h ago", state: "New" as Filter, tone: "terracotta" as const },
  { name: "TechNest HR", avatar: "https://i.pravatar.cc/150?img=14", type: "Corporate", note: "Quarterly offsite, 60 pax, needs AV setup and breakout rooms.", time: "Yesterday", state: "Replied" as Filter, tone: "primary" as const },
  { name: "Meera & Sanjay", avatar: "https://i.pravatar.cc/150?img=45", type: "Retreat", note: "Family wellness weekend, 8 adults 4 kids — veg meals only.", time: "2 days ago", state: "Scheduled" as Filter, tone: "sage" as const },
  { name: "Divya Raghavan", avatar: "https://i.pravatar.cc/150?img=27", type: "Wedding", note: "Engagement ceremony for 80, October — heritage venue preferred.", time: "3 days ago", state: "Replied" as Filter, tone: "primary" as const },
];

const consultations = [
  { with: "Meera & Sanjay", topic: "Retreat weekend walkthrough", when: "Mon, Jul 21 · 5:00 PM", mode: "Video call", avatar: "https://i.pravatar.cc/150?img=45" },
  { with: "Kavya Pillai", topic: "Venue shortlist review", when: "Wed, Jul 23 · 11:00 AM", mode: "Phone", avatar: "https://i.pravatar.cc/150?img=31" },
  { with: "Auroville Arts Council", topic: "Festival production briefing", when: "Thu, Jul 24 · 3:30 PM", mode: "In person", avatar: "https://i.pravatar.cc/150?img=68" },
];

const directory = [
  { name: "Ishita & Dev", phone: "+91 98844 20114", email: "ishita.dev@gmail.com", events: 1, spent: "₹4.5L", last: "Wedding · Aug 2026" },
  { name: "Zoho Corp HR", phone: "+91 44 6744 8000", email: "events@zohocorp.com", events: 3, spent: "₹7.1L", last: "Offsite · Aug 2026" },
  { name: "Rahul Menon", phone: "+91 98407 66412", email: "rahul.m@outlook.com", events: 2, spent: "₹86K", last: "Birthday · Jul 2026" },
  { name: "Auroville Arts Council", phone: "+91 413 262 2045", email: "arts@auroville.org", events: 4, spent: "₹9.8L", last: "Festival · Jul 2026" },
];

export default function EventPlannerContactsPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const visible = enquiries.filter((e) => filter === "All" || e.state === filter);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Contact Management"
        subtitle="Client enquiries, consultation requests and your contact directory."
      />

      <StatGrid
        stats={[
          { label: "New Enquiries", value: "2", delta: "reply within 1h for top rank", icon: MessageSquare },
          { label: "Awaiting Reply", value: "1", delta: "oldest: 18 min", icon: Clock },
          { label: "Consultations This Week", value: "3", delta: "next: Mon 5 PM", icon: CalendarDays },
          { label: "Saved Contacts", value: "86", delta: "12 repeat clients", icon: Users },
        ]}
      />

      {/* Enquiries inbox */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare size={15} className="text-primary" /> Client Enquiries
          </h2>
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <ul className="divide-y divide-surface-hover">
            {visible.map((e) => (
              <li key={e.name} className="flex items-center gap-4 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={e.avatar} alt={e.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{e.type}</span>
                    <StatusPill tone={e.tone}>{e.state}</StatusPill>
                  </div>
                  <p className="text-xs text-muted mt-1">{e.note}</p>
                  <p className="text-[10px] text-subtle mt-0.5 flex items-center gap-1">
                    <Clock size={9} /> {e.time}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button className="px-3.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors">
                    Reply
                  </button>
                  <button aria-label="Call" className="w-8 h-8 rounded-lg border border-border text-muted hover:text-sage hover:border-sage/50 flex items-center justify-center transition-colors">
                    <Phone size={13} />
                  </button>
                </div>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">
                No {filter.toLowerCase()} enquiries.
              </li>
            )}
          </ul>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Consultations */}
        <SectionCard title="Consultation Requests" icon={Video}>
          <ul className="divide-y divide-surface-hover">
            {consultations.map((c) => (
              <li key={c.with} className="flex items-center gap-3 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={c.avatar} alt={c.with} className="w-9 h-9 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.with}</p>
                  <p className="text-xs text-muted truncate">{c.topic}</p>
                  <p className="text-[11px] text-primary mt-0.5">{c.when} · {c.mode}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button className="px-3 py-1.5 text-[11px] font-medium bg-sage/15 text-sage rounded-full hover:bg-sage hover:text-white transition-colors">
                    Join
                  </button>
                  <button className="px-3 py-1.5 text-[11px] font-medium border border-border text-muted rounded-full hover:text-foreground transition-colors">
                    Reschedule
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Directory */}
        <SectionCard title="Contact Directory" icon={Users} action={{ label: "Export CSV", href: "/event-planner/contacts" }}>
          <ul className="divide-y divide-surface-hover">
            {directory.map((d) => (
              <li key={d.name} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  <span className="text-xs text-sage font-semibold tabular-nums">{d.spent}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1"><Phone size={9} /> {d.phone}</span>
                  <span className="flex items-center gap-1"><Mail size={9} /> {d.email}</span>
                </div>
                <p className="text-[10px] text-subtle mt-0.5 flex items-center gap-1">
                  <Star size={9} className="text-primary" /> {d.events} events · last: {d.last}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
