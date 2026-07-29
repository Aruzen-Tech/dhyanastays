"use client";

import { useState } from "react";
import {
  CalendarDays,
  BarChart3,
  Star,
  TrendingUp,
  Check,
  Clock,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// BIKE RENTAL PROVIDER — Bookings & Revenue
// Active rentals (mark returned) · upcoming · earnings
// ============================================

type RentalStatus = "Active" | "Overdue" | "Upcoming" | "Completed";
const tones: Record<RentalStatus, "sage" | "terracotta" | "primary" | "muted"> = {
  Active: "sage",
  Overdue: "terracotta",
  Upcoming: "primary",
  Completed: "muted",
};

interface Rental {
  id: string;
  renter: string;
  avatar: string;
  vehicle: string;
  period: string;
  amount: string;
  status: RentalStatus;
}

const initialRentals: Rental[] = [
  { id: "RB-771", renter: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=5", vehicle: "Vespa ZX 125", period: "Jul 17 – 18", amount: "₹900", status: "Active" },
  { id: "RB-772", renter: "Daniel M.", avatar: "https://i.pravatar.cc/150?img=13", vehicle: "RE Classic 350", period: "Jul 16 – 18", amount: "₹2,700", status: "Active" },
  { id: "RB-768", renter: "Vivek & friends", avatar: "https://i.pravatar.cc/150?img=61", vehicle: "Mahindra Thar 4×4", period: "Jul 15 – 17", amount: "₹9,600", status: "Overdue" },
  { id: "RB-775", renter: "Anita Desai", avatar: "https://i.pravatar.cc/150?img=20", vehicle: "Ather 450X", period: "Jul 20 – 22", amount: "₹1,650", status: "Upcoming" },
  { id: "RB-766", renter: "Meera Krishnan", avatar: "https://i.pravatar.cc/150?img=41", vehicle: "City Trail Bicycle × 2", period: "Jul 14", amount: "₹300", status: "Completed" },
];

const months = [
  { m: "Mar", v: 58 },
  { m: "Apr", v: 66 },
  { m: "May", v: 49 },
  { m: "Jun", v: 78 },
  { m: "Jul", v: 86 },
];

const reviews = [
  { name: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=5", vehicle: "Vespa ZX 125", rating: 5, text: "Spotless scooter, doorstep delivery to our tiny house. Perfect for ECR rides." },
  { name: "Daniel M.", avatar: "https://i.pravatar.cc/150?img=13", vehicle: "RE Classic 350", rating: 5, text: "Bike was serviced and full tank as promised. Suresh even shared a route map." },
  { name: "Sneha Reddy", avatar: "https://i.pravatar.cc/150?img=23", vehicle: "City Trail Bicycle", rating: 4, text: "Good cycles. Would love gel seats for longer rides." },
];

export default function RentalBookingsPage() {
  const [rentals, setRentals] = useState(initialRentals);
  const markReturned = (id: string) =>
    setRentals((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Completed" as RentalStatus } : r)));

  const outNow = rentals.filter((r) => r.status === "Active" || r.status === "Overdue").length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Bookings & Revenue"
        subtitle="Every rental — live, upcoming and returned — with your earnings."
      />

      <StatGrid
        stats={[
          { label: "Out Right Now", value: String(outNow), delta: "1 overdue", icon: Clock },
          { label: "Bookings · July", value: "64", delta: "+11 vs June", icon: CalendarDays },
          { label: "Revenue · July", value: "₹1.2L", delta: "+5% MoM", icon: TrendingUp },
          { label: "Avg Rating", value: "4.8", delta: "196 reviews", icon: Star },
        ]}
      />

      {/* Rentals — mark returned */}
      <SectionCard title="Rental Bookings" icon={CalendarDays}>
        <ul className="divide-y divide-surface-hover">
          {rentals.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={r.avatar} alt={r.renter} className="w-10 h-10 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.renter}</p>
                <p className="text-xs text-muted truncate">{r.vehicle} · {r.period}</p>
                <p className="text-[11px] text-subtle mt-0.5">{r.id}</p>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{r.amount}</span>
              <StatusPill tone={tones[r.status]}>{r.status}</StatusPill>
              {(r.status === "Active" || r.status === "Overdue") && (
                <button
                  onClick={() => markReturned(r.id)}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-[11px] font-semibold bg-sage text-white rounded-full hover:opacity-90 transition-opacity shrink-0"
                >
                  <Check size={11} /> Mark returned
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          Marking a rental returned releases the deposit and frees the vehicle in Fleet Management.
        </p>
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue */}
        <SectionCard title="Revenue Reports" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-3 h-44">
              {months.map((b, i) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">₹{(b.v * 1.4).toFixed(0)}k</span>
                  <div
                    className={`w-full max-w-[48px] rounded-t-lg ${
                      i === months.length - 1 ? "bg-gradient-to-t from-primary to-primary-hover" : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${i === months.length - 1 ? "text-primary font-semibold" : "text-subtle"}`}>{b.m}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-subtle mt-4">
              Weekend rentals are 62% of revenue · doorstep delivery add-on earned ₹8,400 in July.
            </p>
          </div>
        </SectionCard>

        {/* Earnings split */}
        <SectionCard title="Earnings by Vehicle" icon={TrendingUp}>
          <div className="px-5 py-5 space-y-4">
            {[
              { label: "Mahindra Thar 4×4", pct: 38, amount: "₹45.6k" },
              { label: "RE Classic 350", pct: 26, amount: "₹31.2k" },
              { label: "Scooters (3)", pct: 24, amount: "₹28.8k" },
              { label: "Bicycles & EV", pct: 12, amount: "₹14.4k" },
            ].map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted">{c.label}</span>
                  <span className="text-foreground font-medium tabular-nums">{c.amount}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-sage to-primary" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Reviews */}
      <SectionCard title="Customer Reviews" icon={Star}>
        <ul className="divide-y divide-surface-hover">
          {reviews.map((rv) => (
            <li key={rv.name} className="flex items-start gap-3 px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={rv.avatar} alt={rv.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{rv.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{rv.vehicle}</span>
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
