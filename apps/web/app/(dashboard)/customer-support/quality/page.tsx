import {
  Star,
  Bot,
  BarChart3,
  Download,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// CUSTOMER SUPPORT — Quality & Reports
// CSAT, AI accuracy, feedback, resolution reports
// ============================================

const months = [
  { m: "Mar", v: 72 },
  { m: "Apr", v: 78 },
  { m: "May", v: 74 },
  { m: "Jun", v: 84 },
  { m: "Jul", v: 86 },
];

const aiQuality = [
  { label: "Correct resolutions (sampled)", value: "94%", note: "audited weekly, 50 chats" },
  { label: "Wrong/incomplete answers", value: "4.2%", note: "auto-flagged for KB fixes" },
  { label: "Hallucination flags", value: "0.4%", note: "2 cases · both corrected" },
  { label: "Avg messages to resolve", value: "5.8", note: "-0.9 vs June" },
];

const feedback = [
  { name: "Meera Krishnan", avatar: "https://i.pravatar.cc/150?img=41", rating: 5, text: "The chat changed my dates in under two minutes. Didn't feel like a bot at all.", channel: "AI chat" },
  { name: "Daniel M.", avatar: "https://i.pravatar.cc/150?img=13", rating: 5, text: "Asked about deposits at midnight, got a clear answer instantly with the policy linked.", channel: "AI chat" },
  { name: "Rahul Nair", avatar: "https://i.pravatar.cc/150?img=53", rating: 4, text: "Payment issue needed a call, but the agent already had my whole chat — no repeating myself.", channel: "Call center" },
];

const reports = [
  { name: "July resolution report", detail: "86% AI-resolved · CSAT 4.6 · full transcript index", date: "auto-generated monthly" },
  { name: "AI quality audit · week 29", detail: "50 sampled chats · 94% correct · 3 KB fixes shipped", date: "Jul 17" },
  { name: "Call center handoff log · July", detail: "16 redirects · reasons & outcomes", date: "live document" },
];

export default function SupportQualityPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Quality & Reports"
        subtitle="How well the AI is doing — customer feedback, audits and resolution reports."
      />

      <StatGrid
        stats={[
          { label: "CSAT · July", value: "4.6/5", delta: "+0.2 MoM", icon: Star },
          { label: "AI Resolution Rate", value: "86%", delta: "goal ≥ 80%", icon: Bot },
          { label: "Reopened Chats", value: "2.1%", delta: "-0.6 vs June", icon: TrendingUp },
          { label: "Audit Result", value: "94%", delta: "correct resolutions", icon: ShieldCheck },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* AI resolution trend */}
        <SectionCard title="AI Resolution Rate Trend" icon={BarChart3} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-end justify-between gap-3 h-44">
              {months.map((b, i) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-muted tabular-nums">{b.v}%</span>
                  <div
                    className={`w-full max-w-[48px] rounded-t-lg ${
                      i === months.length - 1 ? "bg-gradient-to-t from-sage to-sage/70" : "bg-surface-hover"
                    }`}
                    style={{ height: `${b.v}%` }}
                  />
                  <span className={`text-xs ${i === months.length - 1 ? "text-sage font-semibold" : "text-subtle"}`}>{b.m}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-subtle mt-4">
              Every point the AI gains here is a call the guest never had to make.
            </p>
          </div>
        </SectionCard>

        {/* AI quality metrics */}
        <SectionCard title="AI Quality Audit" icon={Bot}>
          <ul className="divide-y divide-surface-hover">
            {aiQuality.map((q) => (
              <li key={q.label} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">{q.label}</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{q.value}</p>
                </div>
                <p className="text-[10px] text-subtle mt-0.5">{q.note}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Customer feedback */}
      <SectionCard title="Customer Feedback" icon={Star}>
        <ul className="divide-y divide-surface-hover">
          {feedback.map((f) => (
            <li key={f.name} className="flex items-start gap-3 px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={f.avatar} alt={f.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{f.name}</p>
                  <StatusPill tone={f.channel === "AI chat" ? "sage" : "primary"}>{f.channel}</StatusPill>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: f.rating }).map((_, i) => (
                      <Star key={i} size={10} className="text-primary fill-primary" />
                    ))}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Resolution reports */}
      <SectionCard title="Resolution Reports" icon={Download}>
        <ul className="divide-y divide-surface-hover">
          {reports.map((r) => (
            <li key={r.name} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted mt-0.5">{r.detail}</p>
                <p className="text-[10px] text-subtle mt-0.5">{r.date}</p>
              </div>
              <button
                aria-label={`Download ${r.name}`}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border rounded-full text-muted hover:text-foreground hover:border-border-light transition-colors shrink-0"
              >
                <Download size={13} /> PDF
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
