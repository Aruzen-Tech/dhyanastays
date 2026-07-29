import Link from "next/link";
import {
  Bike,
  CalendarDays,
  TrendingUp,
  Wrench,
  Clock,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// BIKE RENTAL PROVIDER DASHBOARD — Suresh Babu
// Overview: rentals out now, returns, alerts
// ============================================

const activeRentals = [
  { renter: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=5", vehicle: "Vespa ZX 125 · TN-05-AK-2214", due: "Today · 6:00 PM", status: "On time", tone: "sage" as const },
  { renter: "Daniel M.", avatar: "https://i.pravatar.cc/150?img=13", vehicle: "RE Classic 350 · TN-05-BQ-0781", due: "Today · 8:00 PM", status: "On time", tone: "sage" as const },
  { renter: "Vivek & friends", avatar: "https://i.pravatar.cc/150?img=61", vehicle: "Mahindra Thar · TN-05-CJ-4432", due: "Yesterday · 9:00 PM", status: "Overdue 14h", tone: "terracotta" as const },
];

const alerts = [
  { icon: ShieldCheck, text: "Insurance for RE Classic 350 (TN-05-BQ-0781) expires in 9 days — renew now.", tone: "text-terracotta" },
  { icon: Wrench, text: "Vespa ZX 125 crossed 3,000 km since last service — schedule this week.", tone: "text-primary" },
  { icon: MapPin, text: "City Trail Bicycle #3 reported a flat at Serenity Beach — pickup assigned.", tone: "text-muted" },
];

export default function BikeRentalDashboardPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Bike Rental Provider Dashboard"
        subtitle="Welcome back, Suresh — 9 vehicles are out, 3 return today, and 1 is overdue."
        action={{ label: "Manage Fleet", href: "/bike-rental-provider/fleet", icon: Bike }}
      />

      <StatGrid
        stats={[
          { label: "Fleet Size", value: "22", delta: "18 road-ready", icon: Bike },
          { label: "Rented Out Now", value: "9", delta: "3 returning today", icon: CalendarDays },
          { label: "Revenue · July", value: "₹1.2L", delta: "+5% MoM", icon: TrendingUp },
          { label: "Maintenance Due", value: "2", delta: "1 insurance renewal", icon: Wrench },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active rentals */}
        <SectionCard title="Out on Rent" icon={Clock} className="lg:col-span-2" action={{ label: "All bookings", href: "/bike-rental-provider/bookings" }}>
          <ul className="divide-y divide-surface-hover">
            {activeRentals.map((r) => (
              <li key={r.vehicle} className="flex items-center gap-4 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={r.avatar} alt={r.renter} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.renter}</p>
                  <p className="text-xs text-muted truncate">{r.vehicle}</p>
                  <p className="text-[11px] text-subtle mt-0.5">Due back: {r.due}</p>
                </div>
                <StatusPill tone={r.tone}>{r.status}</StatusPill>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Alerts */}
        <SectionCard title="Fleet Alerts" icon={AlertTriangle}>
          <ul className="divide-y divide-surface-hover">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-4">
                <a.icon size={15} className={`${a.tone} shrink-0 mt-0.5`} />
                <p className="text-xs text-muted leading-relaxed">{a.text}</p>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-surface-hover">
            <Link href="/bike-rental-provider/fleet" className="text-xs text-primary hover:underline flex items-center gap-1">
              Open maintenance board <ArrowRight size={12} />
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* Utilization */}
      <div className="bg-gradient-to-r from-sage/15 via-surface to-surface border border-sage/25 rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-sage">Utilization this week</p>
          <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">76%</p>
          <p className="text-sm text-muted mt-1">
            Scooters are your workhorse — 88% utilization. The Thar earns the most per day but sits idle midweek.
          </p>
        </div>
        <p className="text-xs text-muted md:max-w-xs">
          Tip: weekday discount of 15% on the Thar could add ≈ ₹9,600/month based on demand nearby.
        </p>
      </div>
    </div>
  );
}
