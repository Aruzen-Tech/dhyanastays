"use client";

import { Search, Filter, ShieldCheck, Mail, ShieldAlert, User, MapPin } from "lucide-react";

export default function AdminUsersPage() {
  const users = [
    { id: "USR-092", name: "Navin Kumar", role: "Traveller", joined: "Jan 12, 2026", status: "Active", bookings: 4 },
    { id: "USR-091", name: "Priya Desai", role: "Host", joined: "Mar 05, 2026", status: "Active", bookings: 12 },
    { id: "USR-090", name: "Arjun Singh", role: "Investor", joined: "Feb 22, 2026", status: "Pending KYC", bookings: 0 },
    { id: "USR-089", name: "Sarah Miller", role: "Traveller", joined: "Apr 18, 2026", status: "Suspended", bookings: 1 },
    { id: "USR-088", name: "Amit Patel", role: "Super Host", joined: "Nov 30, 2025", status: "Active", bookings: 45 },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="heading-display text-3xl text-foreground mb-2">
            User & Host Management
          </h1>
          <p className="text-sm text-muted">
            Manage all platform accounts, roles, and KYC verifications.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <button className="p-2 bg-surface border border-border rounded-xl text-muted hover:text-foreground transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="text-xs uppercase bg-surface-hover text-subtle">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold">Activity</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-foreground font-medium text-xs">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{u.name}</div>
                        <div className="text-xs text-subtle">{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded font-semibold border ${
                      u.role === "Super Host" ? "bg-primary/10 text-primary border-primary/20" :
                      u.role === "Investor" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                      u.role === "Host" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-border text-muted border-border-light"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{u.joined}</td>
                  <td className="px-6 py-4">{u.bookings} Bookings</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 ${
                      u.status === "Active" ? "text-sage" :
                      u.status === "Suspended" ? "text-red-400" :
                      "text-orange-400"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        u.status === "Active" ? "bg-sage" :
                        u.status === "Suspended" ? "bg-red-400" :
                        "bg-orange-400"
                      }`}></div>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-muted hover:text-foreground transition-colors"><Mail size={16} /></button>
                      <button className="p-1.5 text-muted hover:text-red-400 transition-colors"><ShieldAlert size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex justify-between items-center text-xs text-subtle">
          <span>Showing 1 to 5 of 14,205 entries</span>
          <div className="flex gap-1">
            <button className="px-2 py-1 border border-border rounded text-muted hover:bg-surface-hover">Prev</button>
            <button className="px-2 py-1 border border-border rounded text-muted hover:bg-surface-hover">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
