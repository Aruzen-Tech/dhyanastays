import { Building, Star, CheckCircle2, XCircle, Eye } from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";
import { properties } from "@/lib/mock-data";
import Link from "next/link";

const statuses = [
  { status: "Published", tone: "sage" as const },
  { status: "Published", tone: "sage" as const },
  { status: "Under review", tone: "primary" as const },
  { status: "Published", tone: "sage" as const },
  { status: "Suspended", tone: "terracotta" as const },
];

export default function AdminPropertiesPage() {
  const rows = properties.slice(0, 5).map((p, i) => ({ p, ...statuses[i % statuses.length] }));

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="All Properties"
        subtitle="Every listing on the platform — approve, suspend or inspect."
      />

      <StatGrid
        stats={[
          { label: "Total Listings", value: "212", icon: Building },
          { label: "Published", value: "187", delta: "88% of catalog" },
          { label: "Under Review", value: "19", delta: "6 inspections this week" },
          { label: "Suspended", value: "6", delta: "2 pending appeal" },
        ]}
      />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {["All", "Published", "Under review", "Suspended", "Tiny Houses", "Farm Stays", "Wellness"].map((f, i) => (
          <button
            key={f}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
              i === 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <SectionCard title="Listings" icon={Building}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                <th className="px-5 py-3 font-semibold">Property</th>
                <th className="px-3 py-3 font-semibold">Host</th>
                <th className="px-3 py-3 font-semibold">Rating</th>
                <th className="px-3 py-3 font-semibold">Price</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {rows.map(({ p, status, tone }) => (
                <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images[0]} alt={p.name} className="w-12 h-9 rounded-lg object-cover" />
                      <div>
                        <p className="text-sm text-foreground font-medium">{p.name}</p>
                        <p className="text-[11px] text-subtle">{p.location.city}, {p.location.state}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{p.host.name}</td>
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Star size={11} className="text-primary fill-primary" /> {p.rating}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-sm text-foreground tabular-nums">₹{p.price.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3.5">
                    <StatusPill tone={tone}>{status}</StatusPill>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/stays/${p.slug}`}
                        aria-label="View listing"
                        className="w-8 h-8 rounded-lg border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors"
                      >
                        <Eye size={13} />
                      </Link>
                      <button
                        aria-label="Approve"
                        className="w-8 h-8 rounded-lg border border-border text-muted hover:text-sage hover:border-sage/50 flex items-center justify-center transition-colors"
                      >
                        <CheckCircle2 size={13} />
                      </button>
                      <button
                        aria-label="Suspend"
                        className="w-8 h-8 rounded-lg border border-border text-muted hover:text-terracotta hover:border-terracotta/50 flex items-center justify-center transition-colors"
                      >
                        <XCircle size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <p className="text-[11px] text-subtle">
        Only Approved &amp; Published properties appear in discovery. Suspensions notify the host with a reason automatically.
      </p>
    </div>
  );
}
