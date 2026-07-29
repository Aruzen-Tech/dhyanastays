"use client";

import { useState } from "react";
import {
  Building,
  MapPin,
  Check,
  X,
  Search,
} from "lucide-react";
import { SectionCard, StatusPill, PageHeader } from "@/app/components/DashboardUI";

// ============================================
// SUPER HOST — Properties & Pricing
// Cluster-wide property list + pricing/promotion
// approvals submitted by regional hosts.
// ============================================

const properties = [
  { id: "1", name: "Canopy Tiny House", region: "Auroville", host: "Divya Krishnan", occupancy: "88%", revenue: "₹2.1L", status: "Live" },
  { id: "2", name: "Stone Valley Villa", region: "Yelagiri", host: "Divya Krishnan", occupancy: "74%", revenue: "₹3.4L", status: "Live" },
  { id: "3", name: "Nila Wellness Retreat", region: "Palakkad", host: "Regional Team KL", occupancy: "91%", revenue: "₹2.8L", status: "Live" },
  { id: "4", name: "Bay Breeze Villas", region: "ECR", host: "Suresh Babu", occupancy: "69%", revenue: "₹1.6L", status: "Live" },
  { id: "5", name: "Palmyra Farm Cottage", region: "Auroville", host: "Karuna Homestays", occupancy: "—", revenue: "—", status: "Under Review" },
  { id: "6", name: "Whistling Pines Homestead", region: "Coorg", host: "Regional Team KA", occupancy: "82%", revenue: "₹2.4L", status: "Live" },
];

interface PromoRequest {
  id: string;
  property: string;
  request: string;
  host: string;
  status: "Pending" | "Approved" | "Declined";
}

const initialRequests: PromoRequest[] = [
  { id: "pp1", property: "Canopy Tiny House", request: "Weekend pricing +12% (long weekend demand)", host: "Divya Krishnan", status: "Pending" },
  { id: "pp2", property: "Bay Breeze Villas", request: "FOODIE15 promo bundle with in-house kitchen", host: "Suresh Babu", status: "Pending" },
  { id: "pp3", property: "Whistling Pines Homestead", request: "10% off 3-night+ stays, Aug", host: "Regional Team KA", status: "Pending" },
];

export default function SuperHostPropertiesPage() {
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState(initialRequests);

  const setStatus = (id: string, status: PromoRequest["status"]) =>
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const visible = properties.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Properties & Pricing"
        subtitle="32 properties across your cluster — track performance and approve pricing or promotion requests."
      />

      <SectionCard title="Property Cluster" icon={Building}>
        <div className="px-5 pt-4">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties…"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-background border border-border text-xs text-foreground placeholder-subtle focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-surface-hover">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Property</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Host</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Occupancy</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Revenue</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className="border-b border-surface-hover last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-subtle flex items-center gap-1 mt-0.5"><MapPin size={10} /> {p.region}</p>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{p.host}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground text-xs">{p.occupancy}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground text-xs font-semibold">{p.revenue}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill tone={p.status === "Live" ? "sage" : "primary"}>{p.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Pricing & Promotion Requests" icon={Check}>
        <ul className="divide-y divide-surface-hover">
          {requests.map((r) => (
            <li key={r.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{r.request}</p>
                  <p className="text-xs text-subtle mt-0.5">{r.property} · submitted by {r.host}</p>
                </div>
                <StatusPill tone={r.status === "Approved" ? "sage" : r.status === "Declined" ? "terracotta" : "primary"}>{r.status}</StatusPill>
              </div>
              {r.status === "Pending" && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setStatus(r.id, "Approved")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-sage text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => setStatus(r.id, "Declined")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-border rounded-full text-muted hover:text-terracotta hover:border-terracotta/40 transition-colors"
                  >
                    <X size={12} /> Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
