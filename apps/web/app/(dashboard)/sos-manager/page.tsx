import Link from "next/link";
import {
  Siren,
  Clock,
  ShieldCheck,
  Users,
  ArrowRight,
  MapPin,
  Activity,
  PhoneCall,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SOS MANAGER — Command Center (overview)
// ============================================

const onDuty = [
  { name: "Arjun Kumar (R1)", zone: "Auroville / ECR", phone: "+91 98407 11223", avatar: "https://i.pravatar.cc/150?img=52" },
  { name: "Divya Prasad (R2)", zone: "Kodaikanal", phone: "+91 94861 44770", avatar: "https://i.pravatar.cc/150?img=43" },
  { name: "Dr. Nisha Verma", zone: "Medical liaison · remote", phone: "+91 98940 20981", avatar: "https://i.pravatar.cc/150?img=26" },
];

const recent = [
  { id: "SOS-0142", type: "Medical", note: "Guest allergic reaction · Nila Retreat", time: "Jul 16", result: "Resolved in 18 min" },
  { id: "SOS-0141", type: "Lost route", note: "Trekkers off-trail · Munnar ridge", time: "Jul 14", result: "Guided back · 41 min" },
  { id: "SOS-0140", type: "Vehicle", note: "Scooter breakdown at night · ECR", time: "Jul 12", result: "Pickup sent · 26 min" },
];

export default function SosCommandCenterPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="SOS Command Center"
        subtitle="Welcome, Maj. Arjun Singh — 1 live alert in progress, response team en route."
        action={{ label: "Open Live Response", href: "/sos-manager/live", icon: Siren }}
      />

      {/* Live alert banner */}
      <div className="border border-terracotta/40 bg-terracotta/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <span className="relative w-11 h-11 rounded-full bg-terracotta text-white flex items-center justify-center shrink-0">
          <span className="absolute inset-0 rounded-full bg-terracotta animate-ping opacity-30" />
          <Siren size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            LIVE · SOS-0143 — Priya Sharma, The Canopy Tiny House (Auroville)
          </p>
          <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
            <MapPin size={11} /> GPS sharing active · responder 1.2 km away · ETA 4 min
            <span className="text-subtle">· raised 6 min ago</span>
          </p>
        </div>
        <Link
          href="/sos-manager/live"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-terracotta text-white rounded-full hover:opacity-90 transition-opacity shrink-0"
        >
          Track on map <ArrowRight size={13} />
        </Link>
      </div>

      <StatGrid
        stats={[
          { label: "Live SOS Alerts", value: "1", delta: "response en route", icon: Siren },
          { label: "Avg Response Time", value: "4m 12s", delta: "-38s this week", icon: Clock },
          { label: "Cases This Month", value: "38", delta: "37 resolved", icon: Activity },
          { label: "Resolution Rate", value: "97%", delta: "SLA met", icon: ShieldCheck },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* On duty now — numbers visible */}
        <SectionCard title="On Duty Now" icon={Users} action={{ label: "Manage team", href: "/sos-manager/teams" }}>
          <ul className="divide-y divide-surface-hover">
            {onDuty.map((m) => (
              <li key={m.name} className="flex items-center gap-3 px-5 py-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={m.avatar} alt={m.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted truncate">{m.zone}</p>
                  <p className="text-[11px] text-primary tabular-nums mt-0.5">{m.phone}</p>
                </div>
                <a
                  href={`tel:${m.phone.replace(/\s/g, "")}`}
                  aria-label={`Call ${m.name}`}
                  className="w-9 h-9 rounded-full bg-sage/15 text-sage flex items-center justify-center hover:bg-sage hover:text-white transition-colors shrink-0"
                >
                  <PhoneCall size={14} />
                </a>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Recent cases */}
        <SectionCard title="Recently Resolved" icon={ShieldCheck} action={{ label: "All reports", href: "/sos-manager/reports" }}>
          <ul className="divide-y divide-surface-hover">
            {recent.map((r) => (
              <li key={r.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{r.id}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted">{r.type}</span>
                  <StatusPill tone="sage">{r.result}</StatusPill>
                </div>
                <p className="text-xs text-muted mt-1">{r.note}</p>
                <p className="text-[10px] text-subtle mt-0.5">{r.time}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
