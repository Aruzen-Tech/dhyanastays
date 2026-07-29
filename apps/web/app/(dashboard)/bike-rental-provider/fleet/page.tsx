"use client";

import { useState } from "react";
import {
  Bike,
  Plus,
  Pencil,
  Wrench,
  ShieldCheck,
  FileText,
  Download,
  Fuel,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// BIKE RENTAL PROVIDER — Fleet Management
// Inventory · availability · maintenance · insurance
// ============================================

const types = ["All", "Scooter", "Motorcycle", "SUV", "Bicycle", "EV"] as const;
type VType = (typeof types)[number];

type VStatus = "Available" | "Rented" | "In service";
const statusTone: Record<VStatus, "sage" | "primary" | "muted"> = {
  Available: "sage",
  Rented: "primary",
  "In service": "muted",
};

const fleet: { id: string; name: string; plate: string; type: VType; image: string; perDay: number; odo: string; status: VStatus }[] = [
  { id: "v1", name: "Vespa ZX 125", plate: "TN-05-AK-2214", type: "Scooter", image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=75", perDay: 450, odo: "12,480 km", status: "Rented" },
  { id: "v2", name: "Royal Enfield Classic 350", plate: "TN-05-BQ-0781", type: "Motorcycle", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=75", perDay: 900, odo: "21,940 km", status: "Rented" },
  { id: "v3", name: "Mahindra Thar 4×4", plate: "TN-05-CJ-4432", type: "SUV", image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=75", perDay: 3200, odo: "34,120 km", status: "Rented" },
  { id: "v4", name: "City Trail Bicycle", plate: "Fleet #1–8", type: "Bicycle", image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=75", perDay: 150, odo: "8 units", status: "Available" },
  { id: "v5", name: "Ather 450X", plate: "TN-05-EV-9012", type: "EV", image: "https://images.unsplash.com/photo-1558980664-10e7170b5df9?w=800&q=75", perDay: 550, odo: "6,210 km", status: "Available" },
  { id: "v6", name: "Honda Activa 6G", plate: "TN-05-AK-8830", type: "Scooter", image: "https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=800&q=75", perDay: 400, odo: "18,300 km", status: "In service" },
];

const maintenance = [
  { vehicle: "Honda Activa 6G", task: "Brake pads + general service", eta: "Ready Jul 19", cost: "₹1,850", done: false },
  { vehicle: "Vespa ZX 125", task: "3,000 km service due", eta: "Book this week", cost: "est. ₹1,200", done: false },
  { vehicle: "Mahindra Thar 4×4", task: "AC gas top-up", eta: "Completed Jul 12", cost: "₹2,400", done: true },
];

const insurance = [
  { vehicle: "RE Classic 350 · TN-05-BQ-0781", validity: "Expires Jul 27, 2026", tone: "terracotta" as const, label: "9 days left" },
  { vehicle: "Vespa ZX 125 · TN-05-AK-2214", validity: "Valid till Feb 2027", tone: "sage" as const, label: "Valid" },
  { vehicle: "Mahindra Thar · TN-05-CJ-4432", validity: "Valid till Nov 2026", tone: "sage" as const, label: "Valid" },
  { vehicle: "Ather 450X · TN-05-EV-9012", validity: "Valid till Apr 2027", tone: "sage" as const, label: "Valid" },
];

export default function FleetManagementPage() {
  const [type, setType] = useState<VType>("All");
  const visible = fleet.filter((v) => type === "All" || v.type === type);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Fleet Management"
        subtitle="Inventory, availability, service records and insurance documents."
        action={{ label: "Add Vehicle", href: "/bike-rental-provider/fleet", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Vehicles", value: "22", delta: "6 models · 8 bicycles", icon: Bike },
          { label: "Available Now", value: "10", delta: "9 rented · 3 in service" },
          { label: "Avg Rate", value: "₹640/day", delta: "Thar tops at ₹3,200", icon: Fuel },
          { label: "Service Spend · Jul", value: "₹6,050", delta: "3 jobs", icon: Wrench },
        ]}
      />

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
              type === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Vehicle cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {visible.map((v) => (
          <div key={v.id} className="bg-surface border border-border rounded-2xl overflow-hidden card-hover">
            <div className="relative h-36 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={v.image} alt={v.name} className="w-full h-full object-cover" />
              <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider bg-background/85 backdrop-blur-sm text-foreground rounded-full">
                {v.type}
              </span>
              <span className="absolute top-3 right-3">
                <StatusPill tone={statusTone[v.status]}>{v.status}</StatusPill>
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-foreground">{v.name}</p>
              <p className="text-[11px] text-subtle mt-0.5 tabular-nums">{v.plate} · {v.odo}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-hover">
                <p className="text-sm font-bold text-foreground tabular-nums">
                  ₹{v.perDay}<span className="text-subtle font-normal text-xs">/day</span>
                </p>
                <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors">
                  <Pencil size={11} /> Manage
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="text-sm text-muted text-center py-10 bg-surface border border-border rounded-2xl">
          No {type} vehicles in the fleet yet.
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Maintenance */}
        <SectionCard title="Vehicle Maintenance" icon={Wrench} action={{ label: "Log job", href: "/bike-rental-provider/fleet" }}>
          <ul className="divide-y divide-surface-hover">
            {maintenance.map((m) => (
              <li key={m.vehicle + m.task} className="flex items-center gap-3 px-5 py-4">
                <span className={`w-2 h-2 rounded-full shrink-0 ${m.done ? "bg-sage" : "bg-terracotta"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.vehicle}</p>
                  <p className="text-xs text-muted">{m.task}</p>
                  <p className="text-[11px] text-subtle mt-0.5">{m.eta}</p>
                </div>
                <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">{m.cost}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Insurance documents */}
        <SectionCard title="Insurance Documents" icon={ShieldCheck}>
          <ul className="divide-y divide-surface-hover">
            {insurance.map((d) => (
              <li key={d.vehicle} className="flex items-center gap-3 px-5 py-3.5">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.vehicle}</p>
                  <p className="text-[11px] text-subtle">{d.validity}</p>
                </div>
                <StatusPill tone={d.tone}>{d.label}</StatusPill>
                <button
                  aria-label={`Download policy for ${d.vehicle}`}
                  className="w-8 h-8 rounded-lg border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors shrink-0"
                >
                  <Download size={13} />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
