"use client";

import { useState } from "react";
import {
  UtensilsCrossed,
  Star,
  MapPin,
  Plus,
  Pencil,
  Leaf,
  Clock,
  Package,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";
import { foodMenu } from "@/lib/mock-data";

// ============================================
// FOOD PARTNER — Restaurant & Menu
// Profile · dish management · meal packages
// ============================================

const extraDishes = [
  { id: "f5", name: "Millet Sunset Dinner", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=75", cuisine: "Sattvic · Millets", veg: true, pricePerPlate: 380, serves: "1 person", cooks: [] },
  { id: "f6", name: "Village Feast Banana Leaf", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=75", cuisine: "Tamil · Festive", veg: true, pricePerPlate: 520, serves: "1 person", cooks: [] },
];

const packages = [
  { name: "Weekend Stay Meal Plan", desc: "Breakfast + dinner for 2, Fri–Sun", price: "₹4,200", orders: 18 },
  { name: "Wellness Sattvic Week", desc: "7 days, no onion-garlic, millet forward", price: "₹6,900", orders: 9 },
  { name: "Family Farm Feast", desc: "Banana-leaf lunch for 6 with farm tour", price: "₹3,800", orders: 14 },
];

export default function FoodPartnerMenuPage() {
  const allDishes = [...foodMenu, ...extraDishes];
  const [stock, setStock] = useState<Record<string, boolean>>({ f4: false });
  const inStock = (id: string) => stock[id] ?? true;
  const toggle = (id: string) => setStock((p) => ({ ...p, [id]: !inStock(id) }));

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Restaurant & Menu"
        subtitle="Your profile, dishes, availability and meal packages."
        action={{ label: "Add Dish", href: "/food-partner/menu", icon: Plus }}
      />

      {/* Restaurant profile */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-72 h-40 md:h-auto shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            loading="lazy"
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=75"
            alt="Meena's Kitchen"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">Meena&apos;s Kitchen</h2>
            <StatusPill tone="sage">FSSAI verified</StatusPill>
            <StatusPill tone="primary">Curated partner</StatusPill>
          </div>
          <p className="text-xs text-muted mt-1 flex items-center gap-1">
            <MapPin size={11} /> Auroville, Tamil Nadu · serves 4 Dhyana properties nearby
          </p>
          <p className="text-sm text-muted mt-3 leading-relaxed max-w-xl">
            Home-style Chettinad and farm-to-table cooking from a wood-fired kitchen.
            Every meal is cooked to order by named cooks guests can choose.
          </p>
          <div className="flex items-center gap-5 mt-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-primary fill-primary" /> 4.7 (480)
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> 7 AM – 9:30 PM
            </span>
            <button className="text-primary hover:underline flex items-center gap-1">
              <Pencil size={11} /> Edit profile
            </button>
          </div>
        </div>
      </div>

      <StatGrid
        stats={[
          { label: "Dishes Live", value: String(allDishes.length - 1), delta: "1 out of stock", icon: UtensilsCrossed },
          { label: "Veg Dishes", value: "5", delta: "of 6 total", icon: Leaf },
          { label: "Meal Packages", value: "3", delta: "41 sold this month", icon: Package },
          { label: "Best Seller", value: "Chettinad Thali", delta: "412 plates · Jul", icon: Star },
        ]}
      />

      {/* Dish management */}
      <SectionCard title="Menu Management" icon={UtensilsCrossed}>
        <ul className="divide-y divide-surface-hover">
          {allDishes.map((d) => (
            <li key={d.id} className="flex items-center gap-4 px-5 py-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={d.image} alt={d.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  {d.veg && <Leaf size={11} className="text-sage shrink-0" />}
                </div>
                <p className="text-xs text-muted">{d.cuisine} · ₹{d.pricePerPlate}/plate</p>
                {d.cooks.length > 0 && (
                  <p className="text-[11px] text-subtle mt-0.5">
                    Cooks: {d.cooks.map((c) => c.name).join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => toggle(d.id)}
                className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-full transition-colors shrink-0 ${
                  inStock(d.id)
                    ? "bg-sage/15 text-sage hover:bg-sage hover:text-white"
                    : "bg-terracotta/15 text-terracotta hover:bg-terracotta hover:text-white"
                }`}
              >
                {inStock(d.id) ? "In stock" : "Out of stock"}
              </button>
              <button
                aria-label={`Edit ${d.name}`}
                className="w-8 h-8 rounded-lg border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors shrink-0"
              >
                <Pencil size={13} />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Meal packages */}
      <SectionCard title="Meal Packages" icon={Package} action={{ label: "New package", href: "/food-partner/menu" }}>
        <div className="grid sm:grid-cols-3 gap-4 p-5">
          {packages.map((p) => (
            <div key={p.name} className="rounded-xl bg-background border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{p.desc}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-hover">
                <span className="text-sm font-bold text-primary">{p.price}</span>
                <span className="text-[11px] text-subtle">{p.orders} sold</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
