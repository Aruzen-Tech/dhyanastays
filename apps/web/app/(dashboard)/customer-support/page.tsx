import Link from "next/link";
import {
  Bot,
  MessageSquare,
  PhoneCall,
  Star,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  Database,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid } from "@/app/components/DashboardUI";

// ============================================
// CUSTOMER SUPPORT — AI-first Command Center
// AI resolves most queries; everything recorded;
// only selected cases redirect to the call center.
// ============================================

const funnel = [
  { label: "Conversations today", value: 86, pct: 100, cls: "bg-primary" },
  { label: "Resolved by AI", value: 74, pct: 86, cls: "bg-sage" },
  { label: "Human chat takeover", value: 8, pct: 9, cls: "bg-primary-hover" },
  { label: "Redirected to call center", value: 4, pct: 5, cls: "bg-terracotta" },
];

const liveFeed = [
  { time: "2 min ago", text: "AI resolved a refund-status query for Priya S. — booking fetched, policy explained, transcript saved.", kind: "ai" },
  { time: "9 min ago", text: "AI issued coupon WEEKEND500 after a late check-in complaint — action logged for review.", kind: "ai" },
  { time: "16 min ago", text: "Payment dispute from Rahul N. matched redirect rule → call center callback booked (2:30 PM). Full chat attached.", kind: "call" },
  { time: "24 min ago", text: "AI walked a guest through bike-rental deposit terms — 4 KB articles cited, resolved in 6 messages.", kind: "ai" },
  { time: "31 min ago", text: "Guest asked about SOS during trek — AI shared safety card and looped the SOS desk as per rule.", kind: "call" },
];

const topics = ["Refund status", "Change dates", "Pre-book food", "Late check-in", "Deposit terms", "Invoice GST"];

export default function CustomerSupportDashboardPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Customer Support Dashboard"
        subtitle="Welcome back, Priya — the AI is handling the floor. 8 chats have humans in the loop, 4 went to the call center."
        action={{ label: "Open AI Inbox", href: "/customer-support/inbox", icon: MessageSquare }}
      />

      <StatGrid
        stats={[
          { label: "AI Resolution Rate", value: "86%", delta: "target ≥ 80%", icon: Bot },
          { label: "Conversations Today", value: "86", delta: "all recorded", icon: MessageSquare },
          { label: "Call Center Redirects", value: "4", delta: "5% of volume", icon: PhoneCall },
          { label: "CSAT Score", value: "4.6/5", delta: "+0.2 MoM", icon: Star },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* AI funnel */}
        <SectionCard title="Where Conversations End" icon={Bot} className="lg:col-span-1">
          <div className="px-5 py-5 space-y-4">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted">{f.label}</span>
                  <span className="text-foreground font-semibold tabular-nums">{f.value}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className={`h-full rounded-full ${f.cls}`} style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-sage flex items-center gap-1.5 pt-1">
              <Sparkles size={11} /> Goal: resolve everything in the chatbot — redirects only for payments, legal &amp; SOS.
            </p>
          </div>
        </SectionCard>

        {/* Live AI activity — the record */}
        <SectionCard title="Live AI Activity · All Recorded" icon={Database} className="lg:col-span-2" action={{ label: "Open inbox", href: "/customer-support/inbox" }}>
          <ul className="divide-y divide-surface-hover">
            {liveFeed.map((f, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    f.kind === "ai" ? "bg-sage/15 text-sage" : "bg-terracotta/15 text-terracotta"
                  }`}
                >
                  {f.kind === "ai" ? <Bot size={15} /> : <PhoneCall size={15} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted leading-relaxed">{f.text}</p>
                  <p className="text-[10px] text-subtle mt-1 flex items-center gap-1">
                    <Clock size={9} /> {f.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Trending + recording note */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Trending Topics Today" icon={Sparkles}>
          <div className="px-5 py-5 flex flex-wrap gap-2">
            {topics.map((t) => (
              <span key={t} className="text-sm px-4 py-2 rounded-full bg-surface-hover text-muted">
                {t}
              </span>
            ))}
          </div>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Spikes create KB suggestions automatically — 2 new draft articles await your review.
          </p>
        </SectionCard>

        <div className="bg-gradient-to-br from-sage/15 to-surface border border-sage/25 rounded-2xl p-6 flex items-start gap-4">
          <span className="w-10 h-10 rounded-xl bg-sage/20 text-sage flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Every step is on record</p>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              Full transcripts, AI actions (lookups, coupons, reschedules) and call-center handoffs are stored with
              timestamps for 24 months. Escalated calls carry the complete chat history, so the guest never repeats themselves.
            </p>
            <Link href="/customer-support/quality" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
              Review quality &amp; reports <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
