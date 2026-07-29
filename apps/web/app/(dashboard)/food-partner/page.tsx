import Link from "next/link";
import {
  UtensilsCrossed,
  Receipt,
  Star,
  TrendingUp,
  Clock,
  ArrowRight,
  ChefHat,
  Leaf,
  Sparkles,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";
import { foodMenu } from "@/lib/mock-data";

// ============================================
// FOOD PARTNER DASHBOARD — Meena's Kitchen
// Overview: live orders, top dishes, pre-bookings
// ============================================

const liveOrders = [
  { id: "#1284", items: "Chettinad Home Thali × 2", guest: "Priya S. · Canopy Tiny House", status: "Preparing", tone: "primary" as const, time: "12 min" },
  { id: "#1285", items: "Farm Harvest Bowl × 1", guest: "Daniel M. · walk-in", status: "New", tone: "terracotta" as const, time: "just now" },
  { id: "#1283", items: "Dum Biryani Pot (Family) × 1", guest: "Aditya & family · Stone Valley", status: "Ready", tone: "sage" as const, time: "on time" },
];

const preBookings = [
  { dish: "Auroville Breakfast Basket", qty: 4, cook: "Marc D", when: "Tomorrow · 8:00 AM", guest: "Meera K." },
  { dish: "Chettinad Home Thali", qty: 6, cook: "Meena Akka", when: "Jul 20 · 1:00 PM", guest: "Vivek & friends" },
];

export default function FoodPartnerDashboardPage() {
  const topDish = foodMenu[0];

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Food Partner Dashboard"
        subtitle="Welcome back, Meena — 3 live orders in the kitchen and 2 pre-bookings coming up."
        action={{ label: "Manage Menu", href: "/food-partner/menu", icon: UtensilsCrossed }}
      />

      <StatGrid
        stats={[
          { label: "Orders Today", value: "31", delta: "6 pre-booked", icon: Receipt },
          { label: "Revenue Today", value: "₹11,240", delta: "+₹1,800 vs avg", icon: TrendingUp },
          { label: "Menu Items Live", value: "26", delta: "2 out of stock", icon: UtensilsCrossed },
          { label: "Customer Rating", value: "4.7", delta: "480 reviews", icon: Star },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live order queue */}
        <SectionCard title="Live Orders" icon={Clock} className="lg:col-span-2" action={{ label: "All orders", href: "/food-partner/orders" }}>
          <ul className="divide-y divide-surface-hover">
            {liveOrders.map((o) => (
              <li key={o.id} className="flex items-center gap-4 px-5 py-4">
                <span className="text-xs font-bold text-subtle tabular-nums shrink-0">{o.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.items}</p>
                  <p className="text-xs text-muted truncate">{o.guest}</p>
                </div>
                <span className="text-[11px] text-subtle shrink-0">{o.time}</span>
                <StatusPill tone={o.tone}>{o.status}</StatusPill>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Pre-bookings */}
        <SectionCard title="Pre-booked Meals" icon={ChefHat}>
          <ul className="divide-y divide-surface-hover">
            {preBookings.map((p) => (
              <li key={p.dish + p.when} className="px-5 py-4">
                <p className="text-sm font-medium text-foreground">{p.dish} × {p.qty}</p>
                <p className="text-xs text-muted mt-0.5">
                  Cook: <span className="text-sage font-medium">{p.cook}</span> · {p.guest}
                </p>
                <p className="text-[11px] text-primary mt-0.5">{p.when}</p>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Pre-bookings come from the homepage Curated Food hub with quantity and chosen cook.
          </p>
        </SectionCard>
      </div>

      {/* Top dish */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-2/5 h-44 md:h-auto relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={topDish.image} alt={topDish.name} className="w-full h-full object-cover" />
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-background/85 backdrop-blur-sm text-primary rounded-full">
            <Sparkles size={10} /> Bestseller · July
          </span>
        </div>
        <div className="p-6 md:p-8 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{topDish.name}</h2>
            {topDish.veg && <Leaf size={14} className="text-sage" />}
          </div>
          <p className="text-xs text-muted mt-1">{topDish.cuisine} · ₹{topDish.pricePerPlate}/plate · serves {topDish.serves}</p>
          <p className="text-sm text-muted mt-3 leading-relaxed max-w-lg">
            412 plates served this month. Guests love it with Meena Akka as the chosen cook — 92% pick her for this dish.
          </p>
          <div className="flex items-center gap-5 mt-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-primary fill-primary" /> 4.9 for this dish
            </span>
            <span className="text-sage font-medium">₹1,44,200 earned</span>
            <Link href="/food-partner/menu" className="text-primary hover:underline flex items-center gap-1">
              Edit dish <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
