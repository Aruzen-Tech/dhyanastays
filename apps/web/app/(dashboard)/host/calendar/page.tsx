import { CalendarDays, IndianRupee, TrendingUp } from "lucide-react";
import { PageHeader, SectionCard } from "@/app/components/DashboardUI";

// July 2026 — the 1st falls on a Wednesday; today is the 18th
const DAYS_IN_MONTH = 31;
const FIRST_DAY_OFFSET = 3; // Su Mo Tu [We]
const TODAY = 18;

const booked = new Set([3, 4, 5, 6, 11, 12, 13, 14, 24, 25, 26, 27, 28]);
const blocked = new Set([8, 9]);

const pricingRules = [
  { label: "Base price (weekdays)", value: "₹4,500 / night" },
  { label: "Weekend multiplier", value: "+20% · Fri & Sat" },
  { label: "Monsoon season rate", value: "₹3,900 · Jul 1 – Sep 15" },
  { label: "Long stay discount", value: "-15% · 7+ nights" },
  { label: "Festive premium", value: "+35% · Dec 20 – Jan 2" },
];

export default function HostCalendarPage() {
  const cells: (number | null)[] = [
    ...Array.from({ length: FIRST_DAY_OFFSET }, () => null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Calendar & Pricing"
        subtitle="Availability for The Canopy Tiny House — manage bookings, blocks and rates."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <SectionCard title="July 2026" icon={CalendarDays} className="lg:col-span-2">
          <div className="p-5">
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-subtle mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d} className="py-1">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((day, i) => {
                if (day === null) return <span key={`x${i}`} />;
                const isBooked = booked.has(day);
                const isBlocked = blocked.has(day);
                const isToday = day === TODAY;
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs border transition-colors ${
                      isBooked
                        ? "bg-primary/15 border-primary/30 text-primary font-semibold"
                        : isBlocked
                        ? "bg-surface-hover border-border text-subtle line-through"
                        : "bg-background border-border text-muted hover:border-primary/40"
                    } ${isToday ? "ring-2 ring-sage" : ""}`}
                  >
                    {day}
                    {isBooked && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-5 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary/15 border border-primary/30" /> Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-surface-hover border border-border" /> Blocked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-background border border-border" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded ring-2 ring-sage" /> Today
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Pricing rules */}
        <div className="space-y-6">
          <SectionCard title="Pricing Rules" icon={IndianRupee} action={{ label: "Edit", href: "/host/calendar" }}>
            <ul className="divide-y divide-surface-hover">
              {pricingRules.map((r) => (
                <li key={r.label} className="px-5 py-3.5">
                  <p className="text-xs text-subtle">{r.label}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{r.value}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="bg-gradient-to-br from-sage/15 to-surface border border-sage/25 rounded-2xl p-5">
            <p className="text-xs font-semibold text-sage flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp size={13} /> Smart pricing tip
            </p>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Demand around Auroville rises 40% during the Aug 15 long weekend. Raising your rate to ₹5,400 could add ~₹7,200 that week.
            </p>
            <button className="mt-3 text-xs font-medium text-primary hover:underline">Apply suggestion</button>
          </div>
        </div>
      </div>
    </div>
  );
}
