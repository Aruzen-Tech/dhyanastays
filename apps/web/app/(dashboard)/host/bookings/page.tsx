import { CalendarDays, Users, Clock } from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

const bookings = [
  { guest: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=5", property: "The Canopy Tiny House", dates: "Jul 24 – 28", guests: 2, amount: "₹18,000", status: "Confirmed", tone: "sage" as const },
  { guest: "Aditya & Family", avatar: "https://i.pravatar.cc/150?img=15", property: "Stone Valley Farm Stay", dates: "Jul 18 – 19", guests: 5, amount: "₹13,600", status: "Checked-in", tone: "primary" as const },
  { guest: "Meera Krishnan", avatar: "https://i.pravatar.cc/150?img=41", property: "The Canopy Tiny House", dates: "Jul 11 – 14", guests: 2, amount: "₹13,500", status: "Completed", tone: "muted" as const },
  { guest: "Rahul Nair", avatar: "https://i.pravatar.cc/150?img=53", property: "Stone Valley Farm Stay", dates: "Jul 03 – 06", guests: 3, amount: "₹20,400", status: "Completed", tone: "muted" as const },
  { guest: "Sneha Reddy", avatar: "https://i.pravatar.cc/150?img=23", property: "The Canopy Tiny House", dates: "Jun 27 – 29", guests: 2, amount: "₹9,000", status: "Cancelled", tone: "terracotta" as const },
];

const schedule = [
  { label: "Check-out · Aditya & Family", sub: "Stone Valley Farm Stay · today 11:00 AM", tone: "primary" as const },
  { label: "Check-in · Priya Sharma", sub: "The Canopy Tiny House · Jul 24, 2:00 PM", tone: "sage" as const },
];

export default function HostBookingsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Bookings"
        subtitle="Current, upcoming and past reservations across your properties."
      />

      <StatGrid
        stats={[
          { label: "Active Bookings", value: "2", icon: CalendarDays },
          { label: "Upcoming This Month", value: "4", delta: "next: Jul 24" },
          { label: "Guests Hosted", value: "148", delta: "lifetime", icon: Users },
          { label: "Cancellation Rate", value: "3.2%", delta: "below avg" },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Table */}
        <SectionCard title="All Bookings" icon={CalendarDays} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-surface-hover">
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-3 py-3 font-semibold">Dates</th>
                  <th className="px-3 py-3 font-semibold">Guests</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover">
                {bookings.map((b) => (
                  <tr key={b.guest + b.dates} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.avatar} alt={b.guest} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-sm text-foreground font-medium">{b.guest}</p>
                          <p className="text-[11px] text-subtle">{b.property}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-muted whitespace-nowrap">{b.dates}</td>
                    <td className="px-3 py-3.5 text-xs text-muted">{b.guests}</td>
                    <td className="px-3 py-3.5 text-sm text-foreground font-medium tabular-nums">{b.amount}</td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusPill tone={b.tone}>{b.status}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Today's schedule */}
        <SectionCard title="Check-in / Check-out" icon={Clock}>
          <ul className="divide-y divide-surface-hover">
            {schedule.map((s) => (
              <li key={s.label} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted mt-0.5">{s.sub}</p>
                  </div>
                  <StatusPill tone={s.tone}>{s.tone === "primary" ? "Today" : "Upcoming"}</StatusPill>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Guests receive automated check-in instructions 24h before arrival.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
