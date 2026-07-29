"use client";

import { useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  PhoneCall,
  ShieldCheck,
  FileText,
  Camera,
  Home,
  IndianRupee,
} from "lucide-react";
import { PageHeader, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// HOSPITALITY CONSULTANCY — Listing Requests
// Owner submissions run the systematic pass;
// only fully-cleared files reach the manager.
// ============================================

type CheckState = "pass" | "pending" | "fail";

interface Check {
  label: string;
  icon: typeof FileText;
  state: CheckState;
}

interface ListingRequest {
  id: string;
  owner: string;
  avatar: string;
  property: string;
  type: string;
  place: string;
  rooms: string;
  price: string;
  submitted: string;
  image: string;
  checks: Check[];
  scheduled?: boolean;
}

const initialRequests: ListingRequest[] = [
  {
    id: "REQ-118",
    owner: "Lakshmi Narayanan",
    avatar: "https://i.pravatar.cc/150?img=32",
    property: "Lakeview Mud House",
    type: "Eco Stay",
    place: "Yelagiri, Tamil Nadu",
    rooms: "3 cottages · 8 guests",
    price: "₹3,800/night proposed",
    submitted: "Jul 14",
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=75",
    checks: [
      { label: "Land & ownership papers", icon: FileText, state: "pass" },
      { label: "Photo quality (12 uploaded)", icon: Camera, state: "pass" },
      { label: "Location serviceable", icon: MapPin, state: "pass" },
      { label: "Category & concept fit", icon: Home, state: "pass" },
      { label: "Pricing viability", icon: IndianRupee, state: "pass" },
    ],
  },
  {
    id: "REQ-121",
    owner: "Joseph K.",
    avatar: "https://i.pravatar.cc/150?img=57",
    property: "Cardamom Estate Bungalow",
    type: "Heritage Home",
    place: "Thekkady, Kerala",
    rooms: "4 rooms · 10 guests",
    price: "₹6,500/night proposed",
    submitted: "Jul 15",
    image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=75",
    checks: [
      { label: "Land & ownership papers", icon: FileText, state: "pass" },
      { label: "Photo quality (18 uploaded)", icon: Camera, state: "pass" },
      { label: "Location serviceable", icon: MapPin, state: "pass" },
      { label: "Category & concept fit", icon: Home, state: "pass" },
      { label: "Pricing viability", icon: IndianRupee, state: "pass" },
    ],
  },
  {
    id: "REQ-123",
    owner: "Divya Raghavan",
    avatar: "https://i.pravatar.cc/150?img=27",
    property: "Pinewood A-Frame",
    type: "Tiny House",
    place: "Kodaikanal, Tamil Nadu",
    rooms: "1 unit · 3 guests",
    price: "₹4,200/night proposed",
    submitted: "Jul 16",
    image: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=75",
    checks: [
      { label: "Land & ownership papers", icon: FileText, state: "pass" },
      { label: "Photo quality (6 uploaded)", icon: Camera, state: "pending" },
      { label: "Location serviceable", icon: MapPin, state: "pass" },
      { label: "Category & concept fit", icon: Home, state: "pass" },
      { label: "Pricing viability", icon: IndianRupee, state: "pending" },
    ],
  },
  {
    id: "REQ-124",
    owner: "Sandeep Mehta",
    avatar: "https://i.pravatar.cc/150?img=67",
    property: "Skyline Party Villa",
    type: "Luxury Villa",
    place: "ECR, Chennai",
    rooms: "6 rooms · 20 guests",
    price: "₹18,000/night proposed",
    submitted: "Jul 16",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=75",
    checks: [
      { label: "Land & ownership papers", icon: FileText, state: "pending" },
      { label: "Photo quality (22 uploaded)", icon: Camera, state: "pass" },
      { label: "Location serviceable", icon: MapPin, state: "pass" },
      { label: "Category & concept fit", icon: Home, state: "fail" },
      { label: "Pricing viability", icon: IndianRupee, state: "pending" },
    ],
  },
];

const filters = ["All", "Checks passed", "Checks running", "Flagged"] as const;
type Filter = (typeof filters)[number];

const stateOf = (r: ListingRequest): Filter => {
  if (r.checks.some((c) => c.state === "fail")) return "Flagged";
  if (r.checks.every((c) => c.state === "pass")) return "Checks passed";
  return "Checks running";
};

export default function ListingRequestsPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [requests, setRequests] = useState(initialRequests);

  const schedule = (id: string) =>
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, scheduled: true } : r)));

  const visible = requests.filter((r) => filter === "All" || stateOf(r) === filter);
  const readyCount = requests.filter((r) => stateOf(r) === "Checks passed").length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Listing Requests"
        subtitle="Owners apply with full property information — the systematic pass screens every file before it reaches you."
      />

      <StatGrid
        stats={[
          { label: "Open Requests", value: String(requests.length), delta: "this week", icon: ClipboardList },
          { label: "Cleared Systematic Pass", value: String(readyCount), delta: "ready for your call", icon: ShieldCheck },
          { label: "Checks Running", value: "1", delta: "docs & pricing pending", icon: Clock },
          { label: "Flagged", value: "1", delta: "concept fit failed", icon: XCircle },
        ]}
      />

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Request cards */}
      <div className="space-y-5">
        {visible.map((r) => {
          const st = stateOf(r);
          const passed = r.checks.filter((c) => c.state === "pass").length;
          return (
            <div key={r.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={r.image} alt={r.property} className="w-full md:w-56 h-40 md:h-auto object-cover shrink-0" />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-foreground">{r.property}</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{r.type}</span>
                        <StatusPill tone={st === "Checks passed" ? "sage" : st === "Flagged" ? "terracotta" : "primary"}>
                          {st === "Checks passed" ? "Systematic pass cleared" : st === "Flagged" ? "Flagged" : `Checks ${passed}/5`}
                        </StatusPill>
                      </div>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {r.place} · {r.rooms} · {r.price}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img loading="lazy" src={r.avatar} alt={r.owner} className="w-6 h-6 rounded-full object-cover" />
                        <p className="text-xs text-muted">
                          Owner: <span className="text-foreground font-medium">{r.owner}</span> · submitted {r.submitted} · {r.id}
                        </p>
                      </div>
                    </div>
                    {st === "Checks passed" &&
                      (r.scheduled ? (
                        <StatusPill tone="sage">Call scheduled · see Reviews</StatusPill>
                      ) : (
                        <button
                          onClick={() => schedule(r.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
                        >
                          <PhoneCall size={13} /> Schedule review call
                        </button>
                      ))}
                  </div>

                  {/* Systematic checks */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-4">
                    {r.checks.map((c) => (
                      <div
                        key={c.label}
                        className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${
                          c.state === "pass"
                            ? "border-sage/40 bg-sage/10"
                            : c.state === "fail"
                            ? "border-terracotta/40 bg-terracotta/10"
                            : "border-border bg-background"
                        }`}
                      >
                        {c.state === "pass" ? (
                          <CheckCircle2 size={13} className="text-sage shrink-0" />
                        ) : c.state === "fail" ? (
                          <XCircle size={13} className="text-terracotta shrink-0" />
                        ) : (
                          <Clock size={13} className="text-subtle shrink-0" />
                        )}
                        <span className="text-[10px] text-muted leading-tight">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="text-sm text-muted text-center py-10 bg-surface border border-border rounded-2xl">
            No requests under “{filter}”.
          </p>
        )}
      </div>

      <p className="text-[11px] text-subtle flex items-center gap-1.5">
        <ShieldCheck size={12} className="text-sage" />
        Requests reach a manager only after clearing all five systematic checks — flagged files go back to the owner with reasons automatically.
      </p>
    </div>
  );
}
