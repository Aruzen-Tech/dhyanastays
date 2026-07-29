"use client";

import { useState } from "react";
import {
  CalendarDays,
  BarChart3,
  Star,
  Check,
  X,
  Users,
  Clock,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// EXPERIENCE HOST — Bookings & Revenue
// Requests (approve/decline) · sessions · reviews
// ============================================

type ReqStatus = "Pending" | "Approved" | "Declined";

interface BookingRequest {
  id: string;
  name: string;
  avatar: string;
  exp: string;
  date: string;
  guests: number;
  amount: string;
  status: ReqStatus;
}

const initialRequests: BookingRequest[] = [
  { id: "r1", name: "Anita Desai", avatar: "https://i.pravatar.cc/150?img=20", exp: "Farm-to-Table Cooking Class", date: "Jul 22 · 10:00 AM", guests: 4, amount: "₹6,000", status: "Pending" },
  { id: "r2", name: "Vivek & friends", avatar: "https://i.pravatar.cc/150?img=61", exp: "Western Ghats Trek", date: "Jul 25 · 6:30 AM", guests: 6, amount: "₹7,200", status: "Pending" },
  { id: "r3", name: "Shalini Rao", avatar: "https://i.pravatar.cc/150?img=38", exp: "Night Photography Safari", date: "Jul 26 · 8:30 PM", guests: 2, amount: "₹4,000", status: "Pending" },
];

const upcoming = [
  { exp: "Sunrise Yoga at Auroville", date: "Jul 19 · 6:00 AM", guests: "10/12", revenue: "₹8,000" },
  { exp: "Pottery Workshop", date: "Jul 19 · 10:30 AM", guests: "7/8", revenue: "₹4,200" },
  { exp: "Spice Plantation Tour", date: "Jul 20 · 9:00 AM", guests: "12/15", revenue: "₹6,000" },
  { exp: "Farm-to-Table Cooking Class", date: "Jul 22 · 10:00 AM", guests: "6/8", revenue: "₹9,000" },
];

const months = [
  { m: "Mar", v: 48 },
  { m: "Apr", v: 61 },
  { m: "May", v: 55 },
  { m: "Jun", v: 78 },
  { m: "Jul", v: 90 },
];

const reviews = [
  { name: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=5", exp: "Sunrise Yoga", rating: 5, text: "Karthik's session at golden hour was the highlight of our trip. Unmissable." },
  { name: "Daniel M.", avatar: "https://i.pravatar.cc/150?img=13", exp: "Night Photography Safari", rating: 5, text: "Shot the Milky Way for the first time — patient teacher, great gear tips." },
  { name: "Ishwarya V.", avatar: "https://i.pravatar.cc/150?img=41", exp: "Pottery Workshop", rating: 4, text: "Lovely riverside studio. Wish it were 30 minutes longer!" },
];

export default function ExperienceBookingsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const setStatus = (id: string, status: ReqStatus) =>
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Bookings & Revenue"
        subtitle="Approve requests, track sessions and watch your earnings grow."
      />

      <StatGrid
        stats={[
          { label: "Pending Requests", value: String(pendingCount), delta: "respond within 4h", icon: CalendarDays },
          { label: "Sessions This Week", value: "11", delta: "4 fully booked", icon: Clock },
          { label: "Revenue · July", value: "₹1.9L", delta: "+7% MoM", icon: BarChart3 },
          { label: "Repeat Guests", value: "28%", delta: "of all bookings", icon: Users },
        ]}
      />

      {/* Booking requests — interactive */}
      <SectionCard title="Booking Requests" icon={CalendarDays}>
        <ul className="divide-y divide-surface-hover">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={r.avatar} alt={r.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                <p className="text-xs text-muted truncate">{r.exp}</p>
                <p className="text-[11px] text-subtle mt-0.5">
                  {r.date} · {r.guests} guests · <span className="text-primary font-medium">{r.amount}</span>
                </p>
              </div>
              {r.status === "Pending" ? (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setStatus(r.id, "Approved")}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium bg-sage text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => setStatus(r.id, "Declined")}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium border border-border text-muted rounded-full hover:text-terracotta hover:border-terracotta/50 transition-colors"
                  >
                    <X size={12} /> Decline
                  </button>
                </div>
              ) : (
                <StatusPill tone={r.status === "Approved" ? "sage" : "terracotta"}>{r.status}</StatusPill>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming sessions */}
        <SectionCard title="Upcoming Sessions" icon={Clock} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[480px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                  <th className="px-5 py-3 font-semibold">Experience</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Guests</th>
                  <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover">
                {upcoming.map((u) => (
                  <tr key={u.exp + u.date} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-foreground font-medium">{u.exp}</td>
                    <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{u.date}</td>
                    <td className="px-3 py-3.5 text-xs text-muted tabular-nums">{u.guests}</td>
                    <td className="px-5 py-3.5 text-right text-sm text-sage font-semibold tabular-nums">{u.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Revenue chart */}
        <SectionCard title="Revenue Tracking" icon={BarChart3}>
          <div className="p-5">
            <div className="flex items-end justify-between gap-2 h-36">
              {months.map((b, i) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted tabular-nums">₹{(b.v * 2.1).toFixed(0)}k</span>
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg ${
                      i === months.length - 1 ? "bg-gradient-to-t from-primary to-primary-hover" : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-[10px] ${i === months.length - 1 ? "text-primary font-semibold" : "text-subtle"}`}>{b.m}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-subtle mt-3">Payouts settle every Monday.</p>
          </div>
        </SectionCard>
      </div>

      {/* Ratings & reviews */}
      <SectionCard title="Ratings & Reviews" icon={Star}>
        <ul className="divide-y divide-surface-hover">
          {reviews.map((rv) => (
            <li key={rv.name} className="flex items-start gap-3 px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={rv.avatar} alt={rv.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{rv.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{rv.exp}</span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: rv.rating }).map((_, i) => (
                      <Star key={i} size={10} className="text-primary fill-primary" />
                    ))}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">{rv.text}</p>
              </div>
              <button className="text-xs text-primary hover:underline shrink-0">Reply</button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
