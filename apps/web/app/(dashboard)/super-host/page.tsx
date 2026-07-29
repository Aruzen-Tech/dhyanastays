"use client";

import Link from "next/link";
import {
  Building,
  TrendingUp,
  IndianRupee,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Percent,
} from "lucide-react";
import { PageHeader, StatGrid, SectionCard, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SUPER HOST — Cluster Overview
// Manages a cluster of ~10-50 properties across
// several regional hosts. Approves pricing,
// availability & promotions; monitors quality.
// ============================================

const propertyPreview = [
  { id: "p1", name: "Canopy Tiny House", region: "Auroville", occupancy: "88%", revenue: "₹2.1L" },
  { id: "p2", name: "Stone Valley Villa", region: "Yelagiri", occupancy: "74%", revenue: "₹3.4L" },
  { id: "p3", name: "Nila Wellness Retreat", region: "Palakkad", occupancy: "91%", revenue: "₹2.8L" },
];

const pendingPreview = [
  { id: "pp1", property: "Canopy Tiny House", request: "Weekend pricing +12%", host: "Divya Krishnan" },
  { id: "pp2", property: "Bay Breeze Villas", request: "FOODIE15 promo bundle", host: "Suresh Babu" },
];

const alerts = [
  { id: "al1", text: "Maintenance overdue — Stone Valley Villa (pool filter)", tone: "terracotta" as const },
  { id: "al2", text: "Quality audit due this week — 4 properties", tone: "primary" as const },
];

export default function SuperHostPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Cluster Overview"
          subtitle="32 properties across 5 regions — occupancy, revenue, pricing approvals and quality, all in one place."
        />
        <StatusPill tone="sage">South Cluster · 5 regions</StatusPill>
      </div>

      <StatGrid
        stats={[
          { label: "Properties in Cluster", value: "32", delta: "5 regions", icon: Building },
          { label: "Network Occupancy", value: "81%", delta: "+4% QoQ", icon: TrendingUp },
          { label: "Quarterly Revenue", value: "₹2.1Cr", delta: "+9% QoQ", icon: IndianRupee },
          { label: "Team Members", value: "38", delta: "6 regional hosts", icon: Users },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard
          title="Top Performing Properties"
          icon={Building}
          className="lg:col-span-2"
          action={{ label: "View all properties", href: "/super-host/properties" }}
        >
          <ul className="divide-y divide-surface-hover">
            {propertyPreview.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-subtle">{p.region}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-[10px] text-subtle uppercase tracking-wider">Occupancy</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{p.occupancy}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-subtle uppercase tracking-wider">Revenue</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{p.revenue}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Quality Alerts" icon={AlertTriangle}>
          <ul className="divide-y divide-surface-hover">
            {alerts.map((a) => (
              <li key={a.id} className="px-5 py-3.5 flex items-start gap-2.5">
                <StatusPill tone={a.tone}>!</StatusPill>
                <p className="text-xs text-muted leading-relaxed">{a.text}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Pending Pricing & Promo Approvals" icon={Percent} action={{ label: "Review all", href: "/super-host/properties" }}>
        <ul className="divide-y divide-surface-hover">
          {pendingPreview.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{p.request}</p>
                <p className="text-xs text-subtle">{p.property} · submitted by {p.host}</p>
              </div>
              <StatusPill tone="primary">Pending</StatusPill>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-surface-hover">
          <Link href="/super-host/properties" className="text-xs text-primary hover:underline flex items-center gap-1 w-fit">
            Approve pricing & promotions <ArrowUpRight size={12} />
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
