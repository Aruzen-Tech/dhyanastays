import Link from "next/link";
import {
  Camera,
  CalendarDays,
  Star,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";
import { experiences } from "@/lib/mock-data";

// ============================================
// EXPERIENCE HOST DASHBOARD — Karthik Iyer
// Overview: today's sessions, requests, top picks
// ============================================

const todaySessions = [
  { name: "Sunrise Yoga at Auroville", time: "6:00 AM", guests: 8, capacity: 12, status: "Completed", tone: "muted" as const },
  { name: "Pottery Workshop", time: "10:30 AM", guests: 6, capacity: 8, status: "In session", tone: "sage" as const },
  { name: "Night Photography Safari", time: "8:30 PM", guests: 4, capacity: 6, status: "Upcoming", tone: "primary" as const },
];

const pendingRequests = [
  { name: "Anita Desai", avatar: "https://i.pravatar.cc/150?img=20", exp: "Farm-to-Table Cooking Class", date: "Jul 22", guests: 4 },
  { name: "Vivek & friends", avatar: "https://i.pravatar.cc/150?img=61", exp: "Western Ghats Trek", date: "Jul 25", guests: 6 },
];

export default function ExperienceHostDashboardPage() {
  const top = experiences[0];

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Experience Host Dashboard"
        subtitle="Welcome back, Karthik — 3 sessions today and 2 booking requests waiting for you."
        action={{ label: "Manage Listings", href: "/experience-host/listings", icon: Camera }}
      />

      <StatGrid
        stats={[
          { label: "Live Experiences", value: "6", delta: "2 seasonal", icon: Camera },
          { label: "Booking Requests", value: "17", delta: "2 pending approval", icon: CalendarDays },
          { label: "Monthly Revenue", value: "₹1.9L", delta: "+7% MoM", icon: TrendingUp },
          { label: "Average Rating", value: "4.8", delta: "212 reviews", icon: Star },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's sessions */}
        <SectionCard title="Today's Sessions · Jul 18" icon={Clock} className="lg:col-span-2">
          <ul className="divide-y divide-surface-hover">
            {todaySessions.map((s) => (
              <li key={s.name} className="flex items-center gap-4 px-5 py-4">
                <div className="w-16 text-center shrink-0">
                  <p className="text-sm font-semibold text-foreground tabular-nums">{s.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <Users size={11} /> {s.guests}/{s.capacity} booked
                  </p>
                </div>
                <StatusPill tone={s.tone}>{s.status}</StatusPill>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-surface-hover">
            <Link href="/experience-host/bookings" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all bookings & sessions <ArrowRight size={12} />
            </Link>
          </div>
        </SectionCard>

        {/* Pending requests */}
        <SectionCard title="Pending Requests" icon={CalendarDays} action={{ label: "Review all", href: "/experience-host/bookings" }}>
          <ul className="divide-y divide-surface-hover">
            {pendingRequests.map((r) => (
              <li key={r.name} className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted truncate">{r.exp}</p>
                    <p className="text-[11px] text-subtle mt-0.5">{r.date} · {r.guests} guests</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Approve within 4 hours to keep your instant-book badge.
          </p>
        </SectionCard>
      </div>

      {/* Top experience */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-2/5 h-44 md:h-auto relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={top.image} alt={top.name} className="w-full h-full object-cover" />
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-background/85 backdrop-blur-sm text-primary rounded-full">
            <Sparkles size={10} /> Top earner · July
          </span>
        </div>
        <div className="p-6 md:p-8 flex-1">
          <h2 className="text-lg font-semibold text-foreground">{top.name}</h2>
          <p className="text-xs text-muted mt-1 flex items-center gap-1">
            <MapPin size={11} /> {top.location} · {top.duration} · ₹{top.price}/person
          </p>
          <p className="text-sm text-muted mt-3 leading-relaxed max-w-lg">{top.description}</p>
          <div className="flex items-center gap-5 mt-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-primary fill-primary" /> {top.rating} ({top.reviewCount})
            </span>
            <span>68 bookings this month</span>
            <span className="text-sage font-medium">₹54,400 earned</span>
          </div>
        </div>
      </div>
    </div>
  );
}
