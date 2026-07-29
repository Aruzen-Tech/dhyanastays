"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, CheckCircle2, IndianRupee, MessageSquare, TrendingUp, Users } from "lucide-react";

export default function HostDashboardOverview() {
  const kpis = [
    { label: "Monthly Revenue", value: "₹4,25,000", change: "+12.5%", icon: IndianRupee },
    { label: "Occupancy Rate", value: "78%", change: "+5.2%", icon: BarChart3 },
    { label: "Upcoming Bookings", value: "12", change: "Steady", icon: Calendar },
    { label: "Average Rating", value: "4.92", change: "+0.05", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="heading-display text-3xl text-foreground mb-2">
            Host Overview
          </h1>
          <p className="text-sm text-muted">
            Welcome back. Here's what's happening with your properties today.
          </p>
        </div>
        <Link
          href="/host/onboarding"
          className="px-6 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors"
        >
          Add New Property
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <kpi.icon size={100} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-primary">
                <kpi.icon size={20} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                kpi.change.startsWith("+") ? "bg-sage/20 text-sage" : "bg-border text-muted"
              }`}>
                {kpi.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
            <div className="text-sm text-muted">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">

          {/* Action Required */}
          <div className="bg-gradient-to-r from-surface to-surface-hover border border-primary/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-primary" size={20} /> Action Required
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                <div className="flex items-center gap-4">
                  <MessageSquare className="text-muted" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">New message from Guest (Booking DHY-8472)</h3>
                    <p className="text-xs text-subtle">"Hi, what time is check-in allowed?"</p>
                  </div>
                </div>
                <button className="text-sm text-primary font-medium hover:underline">Reply</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="text-muted" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Approve early check-in request</h3>
                    <p className="text-xs text-subtle">Arriving at 11:00 AM on Oct 15</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border border-border text-xs font-medium text-foreground rounded-lg hover:bg-surface-hover">Decline</button>
                  <button className="px-3 py-1.5 bg-primary text-xs font-medium text-primary-foreground rounded-lg hover:bg-primary-hover">Approve</button>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Arrivals */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-foreground">Upcoming Arrivals</h2>
              <Link href="/host/calendar" className="text-sm text-primary hover:underline">View Calendar</Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted">
                <thead className="text-xs uppercase bg-surface-hover text-subtle">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Guest</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3 rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-foreground font-medium text-xs">NK</div>
                        <span className="font-medium text-foreground">Navin Kumar</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">The Glasshouse in the Pines</td>
                    <td className="px-4 py-4">Oct 15 - Oct 18</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-sage/10 text-sage text-[10px] rounded border border-sage/20 uppercase tracking-wider font-semibold">Confirmed</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-foreground font-medium text-xs">SM</div>
                        <span className="font-medium text-foreground">Sarah Miller</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">Heritage Courtyard</td>
                    <td className="px-4 py-4">Oct 16 - Oct 20</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] rounded border border-primary/20 uppercase tracking-wider font-semibold">Pending</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Revenue Chart Placeholder */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Revenue this month</h3>
            <div className="h-48 w-full flex items-end justify-between gap-2 border-b border-border pb-2 mb-2">
              {[40, 70, 45, 90, 60, 100, 85].map((height, i) => (
                <div key={i} className="w-full bg-primary rounded-t-sm transition-all hover:opacity-80" style={{ height: `${height}%` }}></div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-subtle uppercase tracking-wider">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-surface-hover rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Dhyana Host Tip</h3>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Properties with updated high-resolution architectural photography receive 40% more booking inquiries.
            </p>
            <button className="text-sm text-primary hover:underline font-medium">Request professional shoot</button>
          </div>
        </div>
      </div>
    </div>
  );
}
