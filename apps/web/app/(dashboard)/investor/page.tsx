"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Building, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";

export default function InvestorDashboardOverview() {
  const portfolio = [
    { name: "The Glasshouse in the Pines", location: "Himachal", invested: 500000, ownership: "2.5%", return: "+12.4%", status: "Active" },
    { name: "Heritage Courtyard", location: "Rajasthan", invested: 250000, ownership: "1.0%", return: "+8.2%", status: "Active" },
    { name: "Coastal Eco Resort", location: "Goa", invested: 1000000, ownership: "5.0%", return: "Developing", status: "In Progress" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="heading-display text-3xl text-foreground mb-2">
            Investor Portfolio
          </h1>
          <p className="text-sm text-muted">
            Track your fractional ownerships and monthly yields across Dhyana properties.
          </p>
        </div>
        <Link
          href="/investor/projects"
          className="px-6 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-2"
        >
          Explore New Projects <ArrowRight size={16} />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Invested", value: "₹18,50,000", change: "", icon: Wallet },
          { label: "Total Yield (YTD)", value: "₹1,42,000", change: "+14.2%", icon: TrendingUp },
          { label: "Active Properties", value: "3", change: "1 In Dev", icon: Building },
          { label: "Avg Annual Return", value: "11.8%", change: "+0.4%", icon: BarChart3 },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <kpi.icon size={100} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-primary">
                <kpi.icon size={20} />
              </div>
              {kpi.change && (
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                  kpi.change.startsWith("+") ? "bg-sage/20 text-sage" : "bg-border text-muted"
                }`}>
                  {kpi.change}
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
            <div className="text-sm text-muted">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">

          {/* Portfolio Table */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-foreground">My Assets</h2>
              <button className="text-sm text-primary hover:underline">Download Report</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted">
                <thead className="text-xs uppercase bg-surface-hover text-subtle">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Property</th>
                    <th className="px-4 py-3">Invested</th>
                    <th className="px-4 py-3">Ownership</th>
                    <th className="px-4 py-3">Yield</th>
                    <th className="px-4 py-3 rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {portfolio.map((item, i) => (
                    <tr key={i} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-subtle">{item.location}</div>
                      </td>
                      <td className="px-4 py-4 font-medium text-foreground">₹{item.invested.toLocaleString()}</td>
                      <td className="px-4 py-4">{item.ownership}</td>
                      <td className="px-4 py-4">
                        <span className={`flex items-center gap-1 ${item.return.startsWith('+') ? 'text-sage' : 'text-subtle'}`}>
                          {item.return.startsWith('+') ? <ArrowUpRight size={14} /> : null} {item.return}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded font-semibold border ${
                          item.status === "Active" ? "bg-sage/10 text-sage border-sage/20" : "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Yield Performance (2026)</h2>
            <div className="h-64 flex items-end justify-between gap-2 border-b border-border pb-2 mb-2 relative">
              {/* Mock chart lines */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-10">
                <div className="w-full h-px bg-foreground"></div>
                <div className="w-full h-px bg-foreground"></div>
                <div className="w-full h-px bg-foreground"></div>
                <div className="w-full h-px bg-foreground"></div>
              </div>

              {[30, 45, 60, 50, 75, 80, 70, 90, 85, 95].map((height, i) => (
                <div key={i} className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-t-sm" style={{ height: `${height}%` }}></div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-subtle uppercase tracking-wider">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Wallet / Payout */}
          <div className="bg-gradient-to-r from-surface to-surface-hover border border-primary/30 rounded-2xl p-6">
            <div className="text-sm font-medium text-muted mb-2 uppercase tracking-wider">Next Payout</div>
            <div className="text-3xl font-bold text-foreground mb-1">₹24,500</div>
            <div className="text-xs text-subtle mb-6">Expected on Nov 1, 2026</div>

            <button className="w-full py-3 bg-surface-hover border border-border text-foreground font-medium text-sm rounded-xl hover:bg-surface-hover transition-colors mb-3">
              Withdraw to Bank
            </button>
            <button className="w-full py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors">
              Reinvest
            </button>
          </div>

          {/* Recent Documents */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recent Documents</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer border border-transparent hover:border-border">
                <div className="w-10 h-10 rounded-lg bg-border flex items-center justify-center text-muted"><FileText size={18} /></div>
                <div>
                  <div className="text-sm font-medium text-foreground">Q3 Performance Report</div>
                  <div className="text-xs text-subtle">Oct 1, 2026</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer border border-transparent hover:border-border">
                <div className="w-10 h-10 rounded-lg bg-border flex items-center justify-center text-muted"><FileText size={18} /></div>
                <div>
                  <div className="text-sm font-medium text-foreground">Share Certificate - TGH</div>
                  <div className="text-xs text-subtle">Sep 15, 2026</div>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 text-xs font-medium text-primary hover:underline">View all documents</button>
          </div>
        </div>
      </div>
    </div>
  );
}
