import {
  Search,
  MessageCircle,
  PhoneCall,
  Mail,
  HelpCircle,
  ChevronRight,
  Clock,
  LifeBuoy,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/app/components/DashboardUI";
import { faqItems } from "@/lib/mock-data";

const topics = [
  { title: "Bookings & Cancellations", desc: "Modify dates, cancel, refunds" },
  { title: "Payments & Invoices", desc: "Failed payments, GST invoices" },
  { title: "During Your Stay", desc: "Host issues, amenities, SOS" },
  { title: "Rewards & Coupons", desc: "Points, codes, referrals" },
];

const tickets = [
  { id: "TKT-2214", subject: "Invoice for Stone Valley stay", status: "Resolved", tone: "sage" as const, time: "Jul 04" },
  { id: "TKT-2287", subject: "Reschedule pottery workshop", status: "In progress", tone: "primary" as const, time: "Jul 16" },
];

export default function TravellerSupportPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Support"
        subtitle="We're here 24×7 — search help articles or talk to a human."
      />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          placeholder="Search help — e.g. “cancel my booking”"
          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border rounded-2xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
        />
      </div>

      {/* Contact channels */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: MessageCircle, title: "Live Chat", sub: "Avg reply < 2 min", cta: "Start chat" },
          { icon: PhoneCall, title: "Call Us", sub: "1800-369-DHYANA", cta: "Call now" },
          { icon: Mail, title: "Email", sub: "care@dhyanastays.in", cta: "Write to us" },
        ].map((c) => (
          <div key={c.title} className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-start">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <c.icon size={18} />
            </span>
            <p className="text-sm font-semibold text-foreground">{c.title}</p>
            <p className="text-xs text-muted mt-0.5 mb-4">{c.sub}</p>
            <button className="mt-auto px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors">
              {c.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Browse Topics" icon={HelpCircle}>
          <ul className="divide-y divide-surface-hover">
            {topics.map((t) => (
              <li key={t.title}>
                <button className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-hover transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted mt-0.5">{t.desc}</p>
                  </div>
                  <ChevronRight size={15} className="text-subtle group-hover:text-foreground transition-colors" />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Your Recent Tickets" icon={LifeBuoy}>
          <ul className="divide-y divide-surface-hover">
            {tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                  <p className="text-xs text-subtle mt-0.5 flex items-center gap-1.5">
                    {t.id} · <Clock size={10} /> {t.time}
                  </p>
                </div>
                <StatusPill tone={t.tone}>{t.status}</StatusPill>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Need urgent help during a trip? Use the SOS tab in the AI Planner — it alerts your host and our response team instantly.
          </p>
        </SectionCard>
      </div>

      {/* FAQ */}
      <SectionCard title="Frequently Asked" icon={HelpCircle} action={{ label: "All FAQs", href: "/faq" }}>
        <ul className="divide-y divide-surface-hover">
          {faqItems.slice(0, 4).map((f) => (
            <li key={f.question} className="px-5 py-4">
              <p className="text-sm font-medium text-foreground">{f.question}</p>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{f.answer}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
