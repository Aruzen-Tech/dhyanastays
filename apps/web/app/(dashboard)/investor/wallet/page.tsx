import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Landmark,
  Download,
  Plus,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/app/components/DashboardUI";

const transactions = [
  { label: "June distribution · Nila Wellness", amount: "+₹16,800", date: "Jul 01", credit: true },
  { label: "June distribution · Canopy Village", amount: "+₹12,400", date: "Jul 01", credit: true },
  { label: "Withdrawal to ICICI ••8834", amount: "-₹25,000", date: "Jun 28", credit: false },
  { label: "May distribution · Stone Valley", amount: "+₹9,050", date: "Jun 01", credit: true },
  { label: "Investment · Glass Pavilion Annexe", amount: "-₹6,00,000", date: "May 12", credit: false },
];

export default function InvestorWalletPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="My Wallet"
        subtitle="Distributions land here first — withdraw anytime or reinvest into new projects."
      />

      {/* Balance card */}
      <div className="bg-gradient-to-r from-primary/15 via-surface to-surface border border-primary/25 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Wallet size={14} /> Available Balance
          </p>
          <p className="text-4xl font-bold text-foreground mt-2 tabular-nums">₹48,250</p>
          <p className="text-sm text-muted mt-1">Next distribution expected Aug 01 · ≈ ₹39,000</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-1.5">
            <ArrowUpRight size={15} /> Withdraw
          </button>
          <button className="px-5 py-2.5 text-sm font-medium border border-border rounded-xl text-foreground hover:border-primary/50 transition-colors flex items-center gap-1.5">
            <Plus size={15} /> Reinvest
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transactions */}
        <SectionCard title="Transactions" icon={Wallet} className="lg:col-span-2" action={{ label: "Statement PDF", href: "/investor/wallet" }}>
          <ul className="divide-y divide-surface-hover">
            {transactions.map((t) => (
              <li key={t.label + t.date} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    t.credit ? "bg-sage/15 text-sage" : "bg-terracotta/15 text-terracotta"
                  }`}
                >
                  {t.credit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{t.label}</p>
                  <p className="text-[11px] text-subtle">{t.date}</p>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${t.credit ? "text-sage" : "text-foreground"}`}>
                  {t.amount}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Linked account */}
        <div className="space-y-6">
          <SectionCard title="Linked Account" icon={Landmark}>
            <div className="px-5 py-4">
              <div className="rounded-xl bg-background border border-border p-4">
                <p className="text-xs text-subtle">ICICI Bank · Savings</p>
                <p className="text-base font-semibold text-foreground mt-1 tabular-nums">•••• •••• 8834</p>
                <div className="flex items-center justify-between mt-3">
                  <StatusPill tone="sage">Verified</StatusPill>
                  <button className="text-xs text-primary hover:underline">Change</button>
                </div>
              </div>
              <p className="text-[11px] text-subtle mt-3">
                Withdrawals settle in 1–2 business days. TDS certificates are issued quarterly.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Statements" icon={Download}>
            <ul className="divide-y divide-surface-hover">
              {["Q2 2026 statement", "Q1 2026 statement", "FY 2025-26 TDS certificate"].map((s) => (
                <li key={s}>
                  <button className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-hover transition-colors group">
                    <span className="text-sm text-muted group-hover:text-foreground transition-colors">{s}</span>
                    <Download size={14} className="text-subtle group-hover:text-primary transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
