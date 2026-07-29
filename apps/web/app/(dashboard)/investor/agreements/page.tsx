import { FileText, Download, FileSignature, ShieldCheck } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/app/components/DashboardUI";

const docs = [
  { name: "Investment Agreement · Glass Pavilion Annexe", project: "Wayanad, Kerala", date: "May 12, 2026", status: "Awaiting e-sign", tone: "terracotta" as const, pending: true },
  { name: "Investment Agreement · Nila Wellness Expansion", project: "Palakkad, Kerala", date: "Aug 20, 2024", status: "Signed", tone: "sage" as const, pending: false },
  { name: "Investment Agreement · Canopy Village Phase 2", project: "Auroville, TN", date: "Jan 14, 2025", status: "Signed", tone: "sage" as const, pending: false },
  { name: "Investment Agreement · Stone Valley Cottages", project: "Kodaikanal, TN", date: "Jun 02, 2025", status: "Signed", tone: "sage" as const, pending: false },
  { name: "Revenue Share Addendum · FY 2026-27", project: "All projects", date: "Apr 01, 2026", status: "Signed", tone: "sage" as const, pending: false },
];

export default function InvestorAgreementsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Agreements"
        subtitle="All your executed and pending investment documents."
      />

      {/* Pending banner */}
      <div className="border border-terracotta/30 bg-terracotta/5 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-terracotta/15 text-terracotta flex items-center justify-center shrink-0">
          <FileSignature size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">1 document awaiting your e-signature</p>
          <p className="text-xs text-muted mt-0.5">
            Glass Pavilion Annexe agreement expires in 6 days — construction payouts begin after signing.
          </p>
        </div>
        <button className="px-4 py-2 text-xs font-semibold bg-terracotta text-white rounded-full hover:opacity-90 transition-opacity shrink-0">
          Review & sign
        </button>
      </div>

      <SectionCard title="All Documents" icon={FileText}>
        <ul className="divide-y divide-surface-hover">
          {docs.map((d) => (
            <li key={d.name} className="flex items-center gap-4 px-5 py-4">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                <p className="text-[11px] text-subtle mt-0.5">
                  {d.project} · {d.date}
                </p>
              </div>
              <StatusPill tone={d.tone}>{d.status}</StatusPill>
              <button
                aria-label={`Download ${d.name}`}
                className="w-9 h-9 rounded-lg border border-border text-muted hover:text-foreground hover:border-border-light flex items-center justify-center transition-colors shrink-0"
              >
                <Download size={14} />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <p className="text-[11px] text-subtle flex items-center gap-1.5">
        <ShieldCheck size={12} className="text-sage" />
        Documents are e-stamped and stored with 256-bit encryption. Originals available on request.
      </p>
    </div>
  );
}
