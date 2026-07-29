"use client";

import { useState } from "react";
import {
  Bot,
  MessageSquare,
  PhoneCall,
  User,
  Check,
  Database,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";
import { PageHeader, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// CUSTOMER SUPPORT — AI Chat Inbox
// AI handles chats; humans watch, take over,
// or redirect a few to the call center.
// ============================================

const filters = ["All", "AI active", "AI resolved", "Escalated"] as const;
type Filter = (typeof filters)[number];

const threads = [
  { id: "c1", name: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=5", topic: "Refund status · DHY-847291", state: "AI active" as Filter, tone: "primary" as const, time: "now", active: true },
  { id: "c2", name: "Daniel M.", avatar: "https://i.pravatar.cc/150?img=13", topic: "Bike deposit terms", state: "AI resolved" as Filter, tone: "sage" as const, time: "12m", active: false },
  { id: "c3", name: "Rahul Nair", avatar: "https://i.pravatar.cc/150?img=53", topic: "Payment dispute · double charge", state: "Escalated" as Filter, tone: "terracotta" as const, time: "16m", active: false },
  { id: "c4", name: "Meera Krishnan", avatar: "https://i.pravatar.cc/150?img=41", topic: "Change trip dates", state: "AI resolved" as Filter, tone: "sage" as const, time: "44m", active: false },
  { id: "c5", name: "Anita Desai", avatar: "https://i.pravatar.cc/150?img=20", topic: "Pre-book food for 6", state: "AI resolved" as Filter, tone: "sage" as const, time: "1h", active: false },
];

const transcript = [
  { from: "guest", text: "Hi, I cancelled my Stone Valley booking on Tuesday but the refund hasn't come yet.", time: "4:02 PM" },
  { from: "ai", text: "Hi Priya! I checked booking DHY-847291 — your cancellation on Jul 15 qualifies for a full refund of ₹13,500. It was initiated the same day and typically reaches your HDFC card in 5–7 business days, so by Jul 22.", time: "4:02 PM", sources: ["Booking DB", "Refund policy"] },
  { from: "guest", text: "Ok. Can you also confirm the amount includes the food pre-booking?", time: "4:03 PM" },
  { from: "ai", text: "Yes — the ₹13,500 covers the stay (₹12,450) plus your pre-booked farm breakfast (₹1,050). I've emailed you the itemised refund note just now.", time: "4:03 PM", sources: ["Booking DB", "Orders DB"] },
];

const processLog = [
  { time: "4:02:11", action: "Guest identified via logged-in session (Priya Sharma)" },
  { time: "4:02:14", action: "Fetched booking DHY-847291 + cancellation record" },
  { time: "4:02:15", action: "Matched refund policy: Flexible · full refund window" },
  { time: "4:03:21", action: "Fetched food pre-booking order #F-2291" },
  { time: "4:03:24", action: "Sent itemised refund note by email — copy attached to case" },
];

export default function AiChatInboxPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [takenOver, setTakenOver] = useState(false);
  const [redirected, setRedirected] = useState(false);

  const visible = threads.filter((t) => filter === "All" || t.state === filter);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader
        title="AI Chat Inbox"
        subtitle="The chatbot answers first, everything is recorded — you step in only when needed."
      />

      {/* Filters */}
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Thread list */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-hover flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" /> Conversations
            </p>
            <span className="text-[10px] font-semibold bg-sage/15 text-sage px-2 py-0.5 rounded-full">86 today</span>
          </div>
          <ul className="divide-y divide-surface-hover">
            {visible.map((t) => (
              <li key={t.id}>
                <button className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors ${t.active ? "bg-primary/10" : "hover:bg-surface-hover"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                      <span className="text-[10px] text-subtle shrink-0">{t.time}</span>
                    </div>
                    <p className="text-xs text-muted truncate">{t.topic}</p>
                    <span className="inline-block mt-1">
                      <StatusPill tone={t.tone}>{t.state}</StatusPill>
                    </span>
                  </div>
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">Nothing under “{filter}”.</li>
            )}
          </ul>
        </div>

        {/* Transcript + process log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-hover flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src="https://i.pravatar.cc/150?img=5" alt="Priya Sharma" className="w-9 h-9 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Priya Sharma · Refund status</p>
                <p className="text-[11px] text-muted flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
                  {redirected ? "Redirected to call center · chat attached" : takenOver ? "You are in the chat" : "AI answering · recording on"}
                </p>
              </div>
              <button
                onClick={() => setTakenOver(true)}
                disabled={takenOver || redirected}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold rounded-full transition-colors ${
                  takenOver ? "bg-sage/15 text-sage" : "bg-primary text-primary-foreground hover:bg-primary-hover"
                } disabled:opacity-60`}
              >
                {takenOver ? <Check size={12} /> : <User size={12} />}
                {takenOver ? "You're in" : "Take over"}
              </button>
              <button
                onClick={() => setRedirected(true)}
                disabled={redirected}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold rounded-full transition-colors ${
                  redirected ? "bg-terracotta/15 text-terracotta" : "border border-terracotta/40 text-terracotta hover:bg-terracotta hover:text-white"
                } disabled:opacity-70`}
              >
                <PhoneCall size={12} />
                {redirected ? "Call booked · 2:30 PM" : "Redirect to call center"}
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto">
              {transcript.map((m, i) =>
                m.from === "guest" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%]">
                      <p className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm px-4 py-2.5">{m.text}</p>
                      <p className="text-[10px] text-subtle mt-1 text-right">{m.time}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} />
                    </span>
                    <div className="max-w-[80%]">
                      <p className="rounded-2xl rounded-tl-sm bg-surface-hover text-foreground text-sm px-4 py-2.5">{m.text}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-subtle">{m.time}</span>
                        {m.sources?.map((s) => (
                          <span key={s} className="flex items-center gap-1 text-[10px] text-subtle bg-surface border border-border px-2 py-0.5 rounded-full">
                            {s.includes("policy") ? <Globe size={8} /> : <Database size={8} />} {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
              {redirected && (
                <p className="text-[11px] text-terracotta bg-terracotta/10 border border-terracotta/30 rounded-xl px-4 py-2.5">
                  Redirect rule applied — call center will ring the guest at 2:30 PM with this full transcript attached.
                </p>
              )}
            </div>
          </div>

          {/* Recorded process log */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-hover flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Database size={14} className="text-sage" /> AI Process Log · recorded automatically
              </p>
              <StatusPill tone="sage">Stored 24 months</StatusPill>
            </div>
            <ul className="divide-y divide-surface-hover">
              {processLog.map((p) => (
                <li key={p.time} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-[10px] text-subtle tabular-nums w-14 shrink-0 flex items-center gap-1">
                    <Clock size={9} /> {p.time}
                  </span>
                  <p className="text-xs text-muted">{p.action}</p>
                </li>
              ))}
            </ul>
            <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover flex items-center gap-1.5">
              <Sparkles size={11} className="text-sage" />
              Every lookup, message and action the AI takes is logged — nothing happens off the record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
