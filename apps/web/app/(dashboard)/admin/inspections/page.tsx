"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Search, MapPin, Eye, FileText, ClipboardList } from "lucide-react";

export default function AdminInspectionsPage() {
  const inspections = [
    { id: "INS-104", property: "The Bamboo House", host: "Vikram S.", location: "Kerala", status: "Pending", date: "Oct 12, 2026" },
    { id: "INS-103", property: "Heritage Courtyard", host: "Sarah M.", location: "Rajasthan", status: "In Progress", date: "Oct 10, 2026" },
    { id: "INS-102", property: "Urban Loft", host: "Rahul K.", location: "Mumbai", status: "Rejected", date: "Oct 05, 2026" },
    { id: "INS-101", property: "The Glasshouse", host: "Amit Patel", location: "Himachal", status: "Approved", date: "Oct 01, 2026" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="heading-display text-3xl text-foreground mb-2">
            Architectural Inspections
          </h1>
          <p className="text-sm text-muted">
            Review property applications and score them across the 7 curation dimensions.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            placeholder="Search ID or Property..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="text-xs uppercase bg-surface-hover text-subtle">
              <tr>
                <th className="px-6 py-4 font-semibold">Inspection ID</th>
                <th className="px-6 py-4 font-semibold">Property & Host</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Requested On</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inspections.map((ins) => (
                <tr key={ins.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{ins.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground mb-1">{ins.property}</div>
                    <div className="text-xs">{ins.host}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-subtle" /> {ins.location}
                    </div>
                  </td>
                  <td className="px-6 py-4">{ins.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded font-semibold border ${
                      ins.status === "Approved" ? "bg-sage/10 text-sage border-sage/20" :
                      ins.status === "Rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      ins.status === "In Progress" ? "bg-primary/10 text-primary border-primary/20" :
                      "bg-border text-muted border-border-light"
                    }`}>
                      {ins.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 bg-surface-hover border border-border rounded-lg text-foreground hover:border-primary transition-colors">
                      <ClipboardList size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo View for Inspection Detail */}
      <div className="mt-12 pt-12 border-t border-border">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <FileText className="text-primary" size={20} /> Scorecard Preview (INS-104)
        </h2>

        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">The 7 Dimensions</h3>
              <div className="space-y-6">
                {[
                  { label: "Architectural Integrity", score: 8 },
                  { label: "Interior Design & Aesthetics", score: 9 },
                  { label: "Cleanliness & Maintenance", score: 0 }, // Pending
                  { label: "Hospitality & Host Warmth", score: 0 },
                  { label: "Sustainability Practices", score: 7 },
                  { label: "Safety & Security", score: 0 },
                  { label: "Guest Experience USP", score: 8 },
                ].map((dim, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted">{dim.label}</span>
                      <span className="font-medium text-foreground">{dim.score > 0 ? `${dim.score}/10` : 'Pending'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${dim.score >= 8 ? 'bg-sage' : dim.score > 0 ? 'bg-primary' : 'bg-transparent'}`}
                        style={{ width: `${(dim.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
               <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">Inspector Notes</h3>
               <textarea
                rows={6}
                defaultValue="The bamboo structure is exceptional and locally sourced. Waiting on cleanliness audit and safety checks before final approval. Recommend improving the lighting in the pathway."
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary resize-none mb-6"
               ></textarea>

               <div className="flex gap-4">
                 <button className="flex-1 py-3 bg-surface-hover border border-red-500/30 text-red-400 font-medium text-sm rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                   <XCircle size={16} /> Reject
                 </button>
                 <button className="flex-1 py-3 bg-sage text-primary-foreground font-semibold text-sm rounded-xl hover:bg-sage/80 transition-colors flex items-center justify-center gap-2">
                   <CheckCircle2 size={16} /> Approve Listing
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
