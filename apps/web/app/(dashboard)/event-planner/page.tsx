"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PartyPopper,
  CalendarDays,
  Image as ImageIcon,
  Video,
  Users,
  MessageSquare,
  Star,
  TrendingUp,
  Plus,
  Pencil,
  Eye,
  Phone,
  Clock,
  MapPin,
  Check,
  Sparkles,
  BarChart3,
  Settings,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// EVENT PLANNER DASHBOARD — Sana Kapoor Events
// Listings · Bookings · Revenue · Enquiries
// ============================================

const eventTypes = ["All", "Wedding", "Corporate", "Birthday", "Retreat", "Festival"] as const;
type EventType = (typeof eventTypes)[number];

const bookings = [
  { id: "EV-1041", client: "Ishita & Dev", avatar: "https://i.pravatar.cc/150?img=36", type: "Wedding", event: "Heritage wedding · 2 days", venue: "Stone Valley Farm, Kodaikanal", date: "Aug 02", guests: 180, value: "₹4,50,000", status: "Confirmed", tone: "sage" as const, advance: "₹1.8L advance received" },
  { id: "EV-1046", client: "Zoho Corp HR", avatar: "https://i.pravatar.cc/150?img=60", type: "Corporate", event: "Leadership offsite · 3 days", venue: "Nila Wellness Retreat, Palakkad", date: "Aug 09", guests: 42, value: "₹2,60,000", status: "Confirmed", tone: "sage" as const, advance: "PO approved · invoice sent" },
  { id: "EV-1049", client: "Rahul Menon", avatar: "https://i.pravatar.cc/150?img=53", type: "Birthday", event: "Surprise 30th · candlelight deck", venue: "The Canopy Tiny House, Auroville", date: "Jul 26", guests: 12, value: "₹48,000", status: "In prep", tone: "primary" as const, advance: "Decor & cake confirmed" },
  { id: "EV-1052", client: "Aura Yoga School", avatar: "https://i.pravatar.cc/150?img=44", type: "Retreat", event: "Silent retreat weekend", venue: "Glass Pavilion, Wayanad", date: "Aug 16", guests: 24, value: "₹1,20,000", status: "Proposal sent", tone: "muted" as const, advance: "Awaiting confirmation" },
  { id: "EV-1038", client: "Auroville Arts Council", avatar: "https://i.pravatar.cc/150?img=68", type: "Festival", event: "Full moon folk festival", venue: "Adishakti Amphitheatre", date: "Jul 31", guests: 300, value: "₹3,10,000", status: "Confirmed", tone: "sage" as const, advance: "Vendors locked · permits done" },
];

const packages = [
  { name: "Heritage Wedding Package", image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=75", from: "₹3,50,000", booked: 14, photos: 48, videos: 6, status: "Live", tone: "sage" as const },
  { name: "Candlelight Proposal Setup", image: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=75", from: "₹18,000", booked: 62, photos: 35, videos: 4, status: "Live", tone: "sage" as const },
  { name: "Farm Corporate Offsite", image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=75", from: "₹85,000", booked: 21, photos: 26, videos: 3, status: "Live", tone: "sage" as const },
  { name: "Festival & Concert Production", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=75", from: "₹1,50,000", booked: 7, photos: 19, videos: 5, status: "Draft", tone: "muted" as const },
];

const funnel = [
  { label: "Enquiries", value: 41, pct: 100 },
  { label: "Consultations", value: 22, pct: 54 },
  { label: "Proposals sent", value: 14, pct: 34 },
  { label: "Booked", value: 9, pct: 22 },
];

const months = [
  { m: "Mar", v: 44 },
  { m: "Apr", v: 58 },
  { m: "May", v: 40 },
  { m: "Jun", v: 72 },
  { m: "Jul", v: 92 },
];

const enquiries = [
  { name: "Kavya Pillai", avatar: "https://i.pravatar.cc/150?img=31", type: "Wedding", note: "Beach wedding for 120, Dec 2026 — budget ₹6L", time: "18 min ago", status: "New", tone: "terracotta" as const },
  { name: "Arvind Swamy", avatar: "https://i.pravatar.cc/150?img=51", type: "Birthday", note: "Anniversary surprise at a tiny house, Aug 14", time: "2 h ago", status: "New", tone: "terracotta" as const },
  { name: "TechNest HR", avatar: "https://i.pravatar.cc/150?img=14", type: "Corporate", note: "Quarterly offsite, 60 pax, needs AV setup", time: "Yesterday", status: "Replied", tone: "primary" as const },
  { name: "Meera & Sanjay", avatar: "https://i.pravatar.cc/150?img=45", type: "Retreat", note: "Family wellness weekend, 8 adults 4 kids", time: "2 days ago", status: "Consultation Jul 21, 5 PM", tone: "sage" as const },
];

export default function EventPlannerDashboardPage() {
  const [filter, setFilter] = useState<EventType>("All");
  const visible = bookings.filter((b) => filter === "All" || b.type === filter);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Event Planner Dashboard"
        subtitle="Welcome back, Sana — 3 events go live in the next 14 days, and 2 new enquiries are waiting."
        action={{ label: "Create Event", href: "#listings", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Bookings This Month", value: "9", delta: "2 weddings · 1 festival", icon: CalendarDays },
          { label: "Event Revenue · Jul", value: "₹6.8L", delta: "+18% MoM", icon: TrendingUp },
          { label: "Lead Conversion", value: "34%", delta: "41 leads → 9 booked", icon: Users },
          { label: "Client Rating", value: "4.9", delta: "320+ events done", icon: Star },
        ]}
      />

      {/* ============ BOOKINGS ============ */}
      <section id="bookings" className="scroll-mt-24 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PartyPopper size={15} className="text-primary" /> Event Bookings
          </h2>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {eventTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {visible.map((b) => (
            <div
              key={b.id}
              className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex items-center gap-3 md:w-64 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={b.avatar} alt={b.client} className="w-11 h-11 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{b.client}</p>
                  <p className="text-[11px] text-subtle">{b.id} · {b.type}</p>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{b.event}</p>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1 truncate">
                  <MapPin size={10} className="shrink-0" /> {b.venue}
                </p>
                <p className="text-[11px] text-sage mt-1 flex items-center gap-1">
                  <Check size={10} /> {b.advance}
                </p>
              </div>
              <div className="flex items-center gap-5 md:gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-subtle">Date</p>
                  <p className="text-sm font-semibold text-foreground">{b.date}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-subtle">Guests</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">{b.guests}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-subtle">Value</p>
                  <p className="text-sm font-semibold text-primary tabular-nums">{b.value}</p>
                </div>
                <StatusPill tone={b.tone}>{b.status}</StatusPill>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-muted text-center py-8 bg-surface border border-border rounded-2xl">
              No {filter.toLowerCase()} bookings right now.
            </p>
          )}
        </div>
      </section>

      {/* ============ LISTINGS ============ */}
      <section id="listings" className="scroll-mt-24 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ImageIcon size={15} className="text-primary" /> Event Listings & Packages
          </h2>
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-full hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
            <Plus size={13} /> New package
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((p) => (
            <div key={p.name} className="bg-surface border border-border rounded-2xl overflow-hidden card-hover">
              <div className="relative h-36 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={p.image} alt={p.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 right-3">
                  <StatusPill tone={p.tone}>{p.status}</StatusPill>
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-foreground leading-snug">{p.name}</p>
                <p className="text-xs text-muted mt-1">
                  From <span className="text-primary font-semibold">{p.from}</span> · {p.booked} booked
                </p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-subtle">
                  <span className="flex items-center gap-1"><ImageIcon size={11} /> {p.photos} photos</span>
                  <span className="flex items-center gap-1"><Video size={11} /> {p.videos} videos</span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-surface-hover">
                  <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors">
                    <Pencil size={11} /> Edit
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors">
                    <Eye size={11} /> Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ REVENUE ============ */}
      <section id="revenue" className="scroll-mt-24 grid lg:grid-cols-3 gap-6">
        <SectionCard title="Event Revenue" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-4 h-40">
              {months.map((b, i) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">₹{(b.v * 0.074).toFixed(1)}L</span>
                  <div
                    className={`w-full max-w-[52px] rounded-t-lg ${
                      i === months.length - 1 ? "bg-gradient-to-t from-primary to-primary-hover" : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${i === months.length - 1 ? "text-primary font-semibold" : "text-subtle"}`}>{b.m}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-subtle mt-4">
              Avg event value <span className="text-foreground font-medium">₹75,500</span> · payouts settle 3 days after each event
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Leads Funnel · July" icon={TrendingUp}>
          <div className="px-5 py-5 space-y-4">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted">{f.label}</span>
                  <span className="text-foreground font-semibold tabular-nums">{f.value}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-sage to-primary" style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-sage flex items-center gap-1.5 pt-1">
              <Sparkles size={11} /> 34% conversion — top 5% of Dhyana event partners
            </p>
          </div>
        </SectionCard>
      </section>

      {/* ============ CONTACTS ============ */}
      <section id="contacts" className="scroll-mt-24">
        <SectionCard title="Client Enquiries & Consultations" icon={MessageSquare} action={{ label: "Open inbox", href: "/event-planner/contacts" }}>
          <ul className="divide-y divide-surface-hover">
            {enquiries.map((e) => (
              <li key={e.name} className="flex items-center gap-4 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={e.avatar} alt={e.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{e.type}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">{e.note}</p>
                  <p className="text-[10px] text-subtle mt-0.5 flex items-center gap-1"><Clock size={9} /> {e.time}</p>
                </div>
                <StatusPill tone={e.tone}>{e.status}</StatusPill>
                <div className="flex gap-1.5 shrink-0">
                  <button aria-label="Reply" className="w-8 h-8 rounded-lg border border-border text-muted hover:text-sage hover:border-sage/50 flex items-center justify-center transition-colors">
                    <MessageSquare size={13} />
                  </button>
                  <button aria-label="Call" className="w-8 h-8 rounded-lg border border-border text-muted hover:text-primary hover:border-primary/50 flex items-center justify-center transition-colors">
                    <Phone size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </section>

      {/* ============ SETTINGS ANCHOR ============ */}
      <section id="settings" className="scroll-mt-24 bg-surface border border-border rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Settings size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Partner Settings</p>
            <p className="text-xs text-muted mt-0.5">Payout account, service areas, team members & notification rules</p>
          </div>
        </div>
        <Link
          href="/event-planner/settings"
          className="text-xs font-medium text-primary-foreground bg-primary px-3.5 py-2 rounded-full hover:bg-primary-hover transition-colors shrink-0"
        >
          Open settings
        </Link>
      </section>
    </div>
  );
}
