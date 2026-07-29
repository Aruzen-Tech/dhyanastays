"use client";

import { useState } from "react";
import {
  Siren,
  PhoneCall,
  MapPin,
  Check,
  Clock,
  LocateFixed,
  Share2,
  Ambulance,
  ShieldAlert,
  Navigation,
  Home,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// SOS MANAGER — Live Response
// Active alert · live GPS guest tracking · queue
// Guest location is shared only after they raise SOS.
// ============================================

const timeline = [
  { step: "SOS raised by guest", time: "3:42 PM", done: true },
  { step: "GPS sharing started", time: "3:42 PM", done: true },
  { step: "Responder assigned (Arjun · R1)", time: "3:44 PM", done: true },
  { step: "En route to guest", time: "3:45 PM", done: true },
  { step: "On scene", time: "ETA 4 min", done: false },
];

const queue = [
  { id: "SOS-0144", guest: "Rahul Nair", where: "Stone Valley Farm, Kodaikanal", type: "Safety check", time: "12 min", status: "Monitoring", tone: "primary" as const },
  { id: "SOS-0139", guest: "Trek group (4)", where: "Munnar ridge trail", type: "Lost route", time: "1 h", status: "Follow-up", tone: "muted" as const },
];

// Emergency numbers directory — maintained by the SOS manager
const emergencyNumbers = [
  { label: "Police control room", number: "100" },
  { label: "Ambulance (108 GVK)", number: "108" },
  { label: "Fire & rescue", number: "101" },
  { label: "PIMS Hospital ER (Auroville)", number: "+91 413 261 6700" },
  { label: "Auroville security", number: "+91 413 262 2121" },
  { label: "Tourist helpline", number: "1363" },
];

export default function SosLiveResponsePage() {
  const [locationShared, setLocationShared] = useState(false);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Live Response"
        subtitle="Active incidents with live guest GPS — location sharing starts the moment a guest raises SOS."
      />

      {/* ===== Active incident ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* GPS MAP */}
        <div className="lg:col-span-2 bg-surface border border-terracotta/40 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-hover">
            <div className="flex items-center gap-2.5">
              <span className="relative w-8 h-8 rounded-lg bg-terracotta/15 text-terracotta flex items-center justify-center">
                <span className="absolute inset-0 rounded-lg bg-terracotta animate-ping opacity-20" />
                <Siren size={15} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">SOS-0143 · Priya Sharma</p>
                <p className="text-[11px] text-muted">The Canopy Tiny House, Auroville · Medical assist</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-terracotta">
              <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" /> Live GPS
            </span>
          </div>

          {/* Mock map */}
          <div className="relative h-[340px] bg-background overflow-hidden">
            <svg viewBox="0 0 600 340" className="absolute inset-0 w-full h-full" aria-label="Live map tracking guest location">
              {/* green areas */}
              <rect x="0" y="0" width="600" height="340" fill="currentColor" className="text-surface" />
              <ellipse cx="90" cy="70" rx="120" ry="80" fill="currentColor" className="text-sage/10" />
              <ellipse cx="520" cy="290" rx="140" ry="90" fill="currentColor" className="text-sage/10" />
              {/* water */}
              <path d="M600 40 C 540 60 560 120 600 140 Z" fill="currentColor" className="text-primary/10" />
              {/* roads */}
              <path d="M0 220 C 150 200 280 240 600 180" stroke="currentColor" strokeWidth="14" fill="none" className="text-surface-hover" />
              <path d="M60 340 C 100 240 180 160 320 60" stroke="currentColor" strokeWidth="10" fill="none" className="text-surface-hover" />
              <path d="M300 340 C 330 260 420 220 600 240" stroke="currentColor" strokeWidth="8" fill="none" className="text-surface-hover" />
              <path d="M0 100 C 120 110 200 90 330 130" stroke="currentColor" strokeWidth="6" fill="none" className="text-surface-hover" />
              {/* responder route (dashed) */}
              <path
                d="M150 268 C 220 250 280 220 355 172"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="7 7"
                fill="none"
                className="text-sage"
              />
              {/* property marker */}
              <circle cx="430" cy="120" r="7" fill="currentColor" className="text-primary" />
              {/* responder marker */}
              <circle cx="150" cy="268" r="8" fill="currentColor" className="text-sage" />
              {/* guest marker */}
              <circle cx="355" cy="172" r="22" fill="currentColor" className="text-terracotta/20">
                <animate attributeName="r" values="14;26;14" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="355" cy="172" r="9" fill="currentColor" className="text-terracotta" />
            </svg>

            {/* labels over map */}
            <div className="absolute left-[52%] top-[38%] -translate-x-1/2 -translate-y-full pb-2 pointer-events-none">
              <span className="px-2.5 py-1 text-[10px] font-semibold bg-terracotta text-white rounded-full shadow-lg whitespace-nowrap">
                Priya S. · guest (moving)
              </span>
            </div>
            <div className="absolute left-[25%] top-[79%] -translate-x-1/2 -translate-y-full pb-2 pointer-events-none">
              <span className="px-2.5 py-1 text-[10px] font-semibold bg-sage text-white rounded-full shadow-lg whitespace-nowrap">
                Arjun (R1) · 1.2 km
              </span>
            </div>
            <div className="absolute left-[71.5%] top-[35%] -translate-x-1/2 -translate-y-full pb-2 pointer-events-none">
              <span className="px-2.5 py-1 text-[10px] font-medium bg-background/90 backdrop-blur-sm text-foreground border border-border rounded-full shadow whitespace-nowrap flex items-center gap-1">
                <Home size={9} /> Canopy Tiny House
              </span>
            </div>

            {/* corner overlays */}
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border text-[10px] text-muted flex items-center gap-1.5">
              <LocateFixed size={11} className="text-terracotta" />
              12.0059° N, 79.8102° E · accuracy 8 m · updated 4 s ago
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-background/90 backdrop-blur-sm border border-border">
              <span className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <Navigation size={12} className="text-sage" /> ETA 4 min · 1.2 km
              </span>
              <span className="text-[11px] text-muted">Guest pace: walking · heading toward main road</span>
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-surface-hover">
            <a
              href="tel:+919884022110"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-terracotta text-white rounded-full hover:opacity-90 transition-opacity"
            >
              <PhoneCall size={13} /> Call guest · +91 98840 22110
            </a>
            <a
              href="tel:+919876543210"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border text-foreground rounded-full hover:border-border-light transition-colors"
            >
              <PhoneCall size={13} /> Call host · Arjun Menon
            </a>
            <button
              onClick={() => setLocationShared(true)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-colors ${
                locationShared
                  ? "bg-sage/15 text-sage"
                  : "border border-border text-foreground hover:border-border-light"
              }`}
            >
              {locationShared ? <Check size={13} /> : <Share2 size={13} />}
              {locationShared ? "Location shared with 108" : "Share live location with ambulance"}
            </button>
          </div>
        </div>

        {/* Timeline + directory */}
        <div className="space-y-6">
          <SectionCard title="Response Timeline" icon={Clock}>
            <div className="px-5 py-4">
              {timeline.map((t, i) => (
                <div key={t.step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                        t.done ? "bg-sage border-sage text-white" : "bg-surface border-terracotta text-terracotta"
                      }`}
                    >
                      {t.done ? <Check size={10} /> : <Clock size={10} />}
                    </span>
                    {i < timeline.length - 1 && <span className={`w-px flex-1 my-0.5 ${t.done ? "bg-sage/50" : "bg-border"}`} />}
                  </div>
                  <div className="pb-4">
                    <p className={`text-xs font-medium ${t.done ? "text-foreground" : "text-terracotta"}`}>{t.step}</p>
                    <p className="text-[10px] text-subtle mt-0.5 tabular-nums">{t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Emergency Directory" icon={ShieldAlert} action={{ label: "Edit numbers", href: "/sos-manager/settings" }}>
            <ul className="divide-y divide-surface-hover">
              {emergencyNumbers.slice(0, 4).map((n) => (
                <li key={n.label} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-xs text-muted">{n.label}</span>
                  <a href={`tel:${n.number.replace(/\s/g, "")}`} className="text-xs font-semibold text-primary tabular-nums hover:underline">
                    {n.number}
                  </a>
                </li>
              ))}
            </ul>
            <p className="px-5 py-3 text-[10px] text-subtle border-t border-surface-hover flex items-center gap-1">
              <Ambulance size={10} /> Numbers listed &amp; maintained by you — full list in Settings.
            </p>
          </SectionCard>
        </div>
      </div>

      {/* ===== Incident queue ===== */}
      <SectionCard title="Active Incidents & Monitoring" icon={Siren}>
        <ul className="divide-y divide-surface-hover">
          {queue.map((q) => (
            <li key={q.id} className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-bold text-subtle tabular-nums shrink-0">{q.id}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{q.guest} · {q.type}</p>
                <p className="text-xs text-muted flex items-center gap-1 truncate">
                  <MapPin size={10} className="shrink-0" /> {q.where}
                </p>
              </div>
              <span className="text-[11px] text-subtle shrink-0">{q.time} ago</span>
              <StatusPill tone={q.tone}>{q.status}</StatusPill>
              <button className="px-3.5 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors shrink-0">
                Open
              </button>
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          Guest location is only accessible after they raise an SOS request, and sharing stops automatically when the case closes.
        </p>
      </SectionCard>
    </div>
  );
}
