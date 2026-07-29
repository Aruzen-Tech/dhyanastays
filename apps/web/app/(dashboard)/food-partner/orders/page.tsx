"use client";

import { useState } from "react";
import {
  Receipt,
  BarChart3,
  Star,
  Clock,
  ChefHat,
  TrendingUp,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// FOOD PARTNER — Orders & Revenue
// Live queue (advance status) · pre-bookings · earnings
// ============================================

type OrderStatus = "New" | "Preparing" | "Ready" | "Delivered";
const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  New: "Preparing",
  Preparing: "Ready",
  Ready: "Delivered",
  Delivered: null,
};
const tones: Record<OrderStatus, "terracotta" | "primary" | "sage" | "muted"> = {
  New: "terracotta",
  Preparing: "primary",
  Ready: "sage",
  Delivered: "muted",
};

interface Order {
  id: string;
  items: string;
  guest: string;
  amount: string;
  status: OrderStatus;
}

const initialOrders: Order[] = [
  { id: "#1285", items: "Farm Harvest Bowl × 1", guest: "Daniel M. · walk-in", amount: "₹420", status: "New" },
  { id: "#1284", items: "Chettinad Home Thali × 2", guest: "Priya S. · Canopy Tiny House", amount: "₹700", status: "Preparing" },
  { id: "#1283", items: "Dum Biryani Pot × 1", guest: "Aditya & family · Stone Valley", amount: "₹950", status: "Ready" },
  { id: "#1282", items: "Breakfast Basket × 3", guest: "Nila Retreat · room 4", amount: "₹840", status: "Delivered" },
];

const preBooked = [
  { dish: "Auroville Breakfast Basket", qty: 4, cook: "Marc D", when: "Tomorrow · 8:00 AM", guest: "Meera K.", amount: "₹1,120" },
  { dish: "Chettinad Home Thali", qty: 6, cook: "Meena Akka", when: "Jul 20 · 1:00 PM", guest: "Vivek & friends", amount: "₹2,100" },
  { dish: "Village Feast Banana Leaf", qty: 8, cook: "Meena Akka", when: "Jul 21 · 12:30 PM", guest: "TechNest offsite", amount: "₹4,160" },
];

const months = [
  { m: "Mar", v: 52 },
  { m: "Apr", v: 60 },
  { m: "May", v: 47 },
  { m: "Jun", v: 74 },
  { m: "Jul", v: 88 },
];

const reviews = [
  { name: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=5", dish: "Chettinad Thali", rating: 5, text: "Best meal of our trip — tasted like a grandmother's kitchen." },
  { name: "Aditya Menon", avatar: "https://i.pravatar.cc/150?img=15", dish: "Dum Biryani Pot", rating: 5, text: "The pot came sealed with dough, opened at the table. Theatre and taste." },
  { name: "Sneha Reddy", avatar: "https://i.pravatar.cc/150?img=23", dish: "Farm Harvest Bowl", rating: 4, text: "Fresh and generous. Would love a spicier dressing option." },
];

export default function FoodPartnerOrdersPage() {
  const [orders, setOrders] = useState(initialOrders);
  const advance = (id: string) =>
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const nxt = nextStatus[o.status];
        return nxt ? { ...o, status: nxt } : o;
      })
    );

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Orders & Revenue"
        subtitle="Run the kitchen queue, track pre-bookings and watch earnings."
      />

      <StatGrid
        stats={[
          { label: "Orders Today", value: "31", delta: "3 in the queue", icon: Receipt },
          { label: "Revenue Today", value: "₹11,240", delta: "+₹1,800 vs avg", icon: TrendingUp },
          { label: "Pre-booked Value", value: "₹7,380", delta: "next 3 days", icon: ChefHat },
          { label: "Avg Prep Time", value: "22 min", delta: "-3 min this week", icon: Clock },
        ]}
      />

      {/* Live queue — click to advance */}
      <SectionCard title="Kitchen Queue" icon={Clock}>
        <ul className="divide-y divide-surface-hover">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-bold text-subtle tabular-nums shrink-0">{o.id}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{o.items}</p>
                <p className="text-xs text-muted truncate">{o.guest}</p>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{o.amount}</span>
              <StatusPill tone={tones[o.status]}>{o.status}</StatusPill>
              {nextStatus[o.status] && (
                <button
                  onClick={() => advance(o.id)}
                  className="px-3.5 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors shrink-0"
                >
                  Mark {nextStatus[o.status]?.toLowerCase()}
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          Tap the button to move an order along — guests get notified at every step.
        </p>
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pre-booked */}
        <SectionCard title="Pre-booked Meals" icon={ChefHat} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[520px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                  <th className="px-5 py-3 font-semibold">Dish</th>
                  <th className="px-3 py-3 font-semibold">Qty</th>
                  <th className="px-3 py-3 font-semibold">Cook</th>
                  <th className="px-3 py-3 font-semibold">When</th>
                  <th className="px-5 py-3 font-semibold text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover">
                {preBooked.map((p) => (
                  <tr key={p.dish + p.when} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-foreground font-medium">{p.dish}</p>
                      <p className="text-[11px] text-subtle">{p.guest}</p>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-muted tabular-nums">× {p.qty}</td>
                    <td className="px-3 py-3.5 text-xs text-sage font-medium whitespace-nowrap">{p.cook}</td>
                    <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{p.when}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-foreground tabular-nums">{p.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Revenue */}
        <SectionCard title="Revenue Reports" icon={BarChart3}>
          <div className="p-5">
            <div className="flex items-end justify-between gap-2 h-36">
              {months.map((b, i) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted tabular-nums">₹{(b.v * 2.95).toFixed(0)}k</span>
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
            <p className="text-[11px] text-subtle mt-3">Settlement every Friday · 10% platform fee.</p>
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
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{rv.dish}</span>
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
