import { Plus, Star, MapPin, Eye, Pencil, Pause, Home } from "lucide-react";
import { PageHeader, StatGrid, StatusPill } from "@/app/components/DashboardUI";
import { properties } from "@/lib/mock-data";
import Link from "next/link";

const listing = [
  { p: properties[0], status: "Live", tone: "sage" as const, occupancy: "82%" },
  { p: properties[1], status: "Live", tone: "sage" as const, occupancy: "74%" },
  { p: properties[2], status: "Paused · seasonal closure", tone: "muted" as const, occupancy: "—" },
];

export default function HostPropertiesPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="My Properties"
        subtitle="Listing control, availability and status for every property you host."
        action={{ label: "Add Property", href: "/host/onboarding", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Total Properties", value: "3", icon: Home },
          { label: "Live Listings", value: "2", delta: "1 paused" },
          { label: "Avg Occupancy", value: "78%", delta: "+5% MoM" },
          { label: "Avg Rating", value: "4.85", delta: "264 reviews", icon: Star },
        ]}
      />

      <div className="space-y-4">
        {listing.map(({ p, status, tone, occupancy }) => (
          <div
            key={p.id}
            className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-5 md:items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.images[0]}
              alt={p.name}
              className="w-full md:w-44 h-32 rounded-xl object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-foreground">{p.name}</h2>
                <StatusPill tone={tone}>{status}</StatusPill>
              </div>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <MapPin size={11} /> {p.location.city}, {p.location.state} · {p.category}
              </p>
              <div className="flex items-center gap-5 mt-3 text-xs text-muted">
                <span>
                  <span className="text-foreground font-semibold">₹{p.price.toLocaleString("en-IN")}</span>/night
                </span>
                <span>
                  Occupancy <span className="text-foreground font-semibold">{occupancy}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Star size={11} className="text-primary fill-primary" />
                  {p.rating} ({p.reviewCount})
                </span>
              </div>
            </div>
            <div className="flex md:flex-col gap-2 shrink-0">
              <Link
                href={`/stays/${p.slug}`}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium border border-border rounded-full text-muted hover:text-foreground hover:border-border-light transition-colors"
              >
                <Eye size={13} /> Preview
              </Link>
              <button className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium border border-border rounded-full text-muted hover:text-foreground hover:border-border-light transition-colors">
                <Pencil size={13} /> Edit
              </button>
              <button className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium border border-border rounded-full text-muted hover:text-terracotta hover:border-terracotta/50 transition-colors">
                <Pause size={13} /> Pause
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-subtle">
        Pausing a property hides it from search instantly. Seasonal closures can be scheduled from Calendar &amp; Pricing.
      </p>
    </div>
  );
}
