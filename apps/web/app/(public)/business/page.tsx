"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ContactSection from "@/app/components/ContactSection";
import {
  Home,
  IndianRupee,
  HardHat,
  Hotel,
  Star,
  Users,
  Briefcase,
  Heart,
  Sparkles,
  Send,
  Bot,
  ArrowRight,
  Check,
  TrendingUp,
  Camera,
  BadgeCheck,
} from "lucide-react";

// ============================================
// BUSINESS HUB — /business
// One door for everyone who wants to build with
// Dhyana: hosts, investors, consultancy clients,
// partners, influencers, careers & volunteers.
// Includes a chatbot for easy redirection.
// ============================================

const tabs = [
  { key: "host", label: "Host & List", icon: Home },
  { key: "invest", label: "Invest", icon: IndianRupee },
  { key: "consultancy", label: "Consultancy", icon: HardHat },
  { key: "influencers", label: "Influencers", icon: Star },
  { key: "careers", label: "Careers", icon: Briefcase },
] as const;
type TabKey = (typeof tabs)[number]["key"];

interface Card {
  icon: typeof Home;
  title: string;
  desc: string;
  cta: string;
  href: string;
}

const cards: Record<TabKey, Card[]> = {
  host: [
    { icon: Home, title: "List your property", desc: "Submit your stay with photos and papers — our systematic checks and a manager call get you approved fast.", cta: "Start listing", href: "/become-a-host" },
    { icon: BadgeCheck, title: "Become a host", desc: "New to hosting? We guide you from first photo to first guest, with quality standards that earn the Curated badge.", cta: "Join as a host", href: "/become-a-host" },
  ],
  invest: [],
  consultancy: [
    { icon: HardHat, title: "Architecture consultancy", desc: "Master plans, drawings, BOQ and site supervision for resorts, tiny houses and eco stays.", cta: "Book architecture", href: "/consultancy/architecture" },
    { icon: Hotel, title: "Hospitality consultancy", desc: "Business plans, revenue models, branding and operations manuals for your property.", cta: "Book hospitality", href: "/consultancy/hospitality" },
  ],
  influencers: [
    { icon: Camera, title: "Influencer program", desc: "Stay free at curated properties, earn on your promo code, and co-create content with our team.", cta: "Apply as influencer", href: "/business/apply-influencer" },
  ],
  careers: [
    { icon: Briefcase, title: "Careers at Dhyana", desc: "Engineering, operations, curation, field inspection — build India's most loved stay platform.", cta: "See open roles", href: "/careers" },
    { icon: Heart, title: "Volunteer with us", desc: "Farm work-exchanges, festival crews and community projects at partner properties.", cta: "Apply to volunteer", href: "/contact" },
  ],
};

const tiers = [
  { name: "Nano", range: "5k – 25k followers", perks: ["1 free stay / quarter", "10% promo code", "Feature on our page"] },
  { name: "Micro", range: "25k – 150k followers", perks: ["Free stay + experiences monthly", "15% promo code + payouts", "Campaign briefs & brand kit"] },
  { name: "Macro", range: "150k+ followers", perks: ["Curated trips, all covered", "Revenue share on campaigns", "Dedicated manager"] },
];

// The three Dhyana investment & partnership models
const investModels = [
  {
    name: "Landowner Partnership",
    tagline: "You own the land. We build the business.",
    forWho: ["Farm owners", "Estate owners", "Hill & beachfront land"],
    points: [
      "You provide the land and fund the development",
      "Dhyana does everything else — feasibility, architecture, branding, marketing, bookings and operations",
      "Your idle land becomes a professionally managed hospitality asset",
    ],
    split: { partners: 70, dhyana: 30, partnersLabel: "You keep ~70%", dhyanaLabel: "Dhyana ~30%" },
  },
  {
    name: "Land Leasing Program",
    tagline: "Lease your land. Earn without developing it.",
    forWho: ["Agricultural land", "Unused family land", "Long-term holders"],
    points: [
      "Submit your property — we inspect and approve suitable sites",
      "Dhyana and its investment partners develop and operate it",
      "You receive lease income with zero operational responsibility",
    ],
    split: null,
    splitNote: "Fixed lease income per agreement — fully passive",
  },
  {
    name: "Joint Investment Partnership",
    tagline: "Land + capital + Dhyana = shared success.",
    forWho: ["Investors with capital", "Landowners", "JV partners"],
    points: [
      "Invest in a unit — we match capital with approved land",
      "Dhyana runs end-to-end: design, construction guidance, tech, marketing and operations",
      "Returns paid as a share of operating revenue, split by your legal agreement",
    ],
    split: { partners: 55, dhyana: 45, partnersLabel: "Landowner + investor 50–60%", dhyanaLabel: "Dhyana 40–50%" },
  },
];

// ---------- Rolling ads ----------
const rollingAds = [
  {
    tag: "Investment",
    headline: "Own a slice of curated hospitality",
    copy: "Three models — partner with your land, lease it, or co-invest capital. Returns paid as a share of operating revenue.",
    cta: "See the models",
    href: "/business",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=75",
  },
  {
    tag: "Why Dhyana",
    headline: "The benefits of being part of Dhyana Stays",
    copy: "Automated payouts, the Curated badge that converts, regional marketing muscle and 24×7 SOS cover for your guests.",
    cta: "Know the perks",
    href: "/about",
    image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1600&q=75",
  },
  {
    tag: "Careers",
    headline: "Build India's most loved stay platform",
    copy: "Engineering, curation, field inspection and operations roles across the south — remote-friendly.",
    cta: "See open roles",
    href: "/careers",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=75",
  },
  {
    tag: "Business",
    headline: "Bring your events, kitchen or fleet",
    copy: "Partners earn from every stay around them — event planners, food kitchens and rental fleets plug straight in.",
    cta: "Become a partner",
    href: "/contact",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=75",
  },
];

// ---------- Chatbot (redirection assistant) ----------
interface Answer {
  match: string[];
  text: string;
  cta: string;
  href: string;
}
const answers: Answer[] = [
  { match: ["list", "property", "host"], text: "To list your property, start host onboarding — upload photos and papers, clear our checks, and a manager calls you for approval.", cta: "Start listing", href: "/become-a-host" },
  { match: ["invest", "roi", "return", "plan", "land", "lease"], text: "We have three models: Landowner Partnership (you keep ~70%), Land Leasing (fixed passive income), and Joint Investment (partners share 50–60%, Dhyana takes 40–50% for running everything). All three are on this page under Invest — our desk will map you to the right one.", cta: "Talk to the investment desk", href: "/contact" },
  { match: ["architect", "design", "consult", "build"], text: "Our architecture team does master plans, drawings and BOQ; the hospitality team does business plans and branding. Book either consultancy online.", cta: "Book consultancy", href: "/consultancy/architecture" },
  { match: ["event", "wedding", "planner"], text: "Event planners join as partners — your packages get booked by travellers across our stays. The partner team will onboard you.", cta: "Apply as event partner", href: "/contact" },
  { match: ["bike", "rental", "vehicle", "car"], text: "Rental providers plug their fleet into stay bookings with doorstep delivery. Apply and our partner team takes it from there.", cta: "Apply as rental partner", href: "/contact" },
  { match: ["food", "kitchen", "cook", "restaurant"], text: "Food partners serve pre-booked meals to guests — with named cooks guests can choose. Apply and we'll verify your kitchen.", cta: "Apply as food partner", href: "/contact" },
  { match: ["influencer", "creator", "instagram", "promo"], text: "Our influencer program has Nano, Micro and Macro tiers — free curated stays, promo-code earnings and campaign collabs, tracked in your own dashboard.", cta: "Apply as influencer", href: "/business/apply-influencer" },
  { match: ["job", "career", "hiring", "work"], text: "We're hiring across engineering, operations and curation — and we love field people who know their regions.", cta: "See open roles", href: "/careers" },
  { match: ["volunteer"], text: "Volunteers join farm work-exchanges, festival crews and community projects at partner properties. Tell us your interests.", cta: "Apply to volunteer", href: "/contact" },
];
const fallback: Answer = {
  match: [],
  text: "I can point you to hosting, investing, consultancy, event/bike/food partnerships, the influencer program, careers or volunteering — which one sounds like you?",
  cta: "Contact us instead",
  href: "/contact",
};

interface ChatMsg {
  role: "user" | "bot";
  text: string;
  cta?: string;
  href?: string;
}

export default function BusinessPage() {
  const [tab, setTab] = useState<TabKey>("host");
  const [ad, setAd] = useState(0);
  const [input, setInput] = useState("");

  // Rolling ads — auto-advance every 5s
  useEffect(() => {
    const t = setInterval(() => setAd((i) => (i + 1) % rollingAds.length), 5000);
    return () => clearInterval(t);
  }, []);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "bot", text: "Namaste! I'm the business assistant. Ask me anything — listing a property, investing, partnerships, jobs — and I'll point you to the right door." },
  ]);

  const ask = (q: string) => {
    const query = q.trim();
    if (!query) return;
    const lower = query.toLowerCase();
    const found = answers.find((a) => a.match.some((m) => lower.includes(m))) ?? fallback;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: query },
      { role: "bot", text: found.text, cta: found.cta, href: found.href },
    ]);
    setInput("");
  };

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-8 pt-16 pb-10 text-center">
        <span className="text-xs font-semibold text-primary uppercase tracking-widest">
          Business with Dhyana
        </span>
        <h1 className="heading-display text-4xl lg:text-6xl text-foreground mt-3">
          One door. Every way to grow with us.
        </h1>
        <p className="text-muted mt-4 max-w-2xl mx-auto">
          Host a stay, invest in a project, book our consultancies, plug in your events,
          bikes or kitchen, create with us as an influencer — or join the team.
        </p>
      </section>

      {/* Tabs */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-start lg:justify-center pb-1 mb-10">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
                tab === key
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-border-light"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Cards for active tab */}
        {cards[tab].length > 0 && (
        <div className={`grid gap-6 stagger-children ${cards[tab].length > 3 ? "sm:grid-cols-2 lg:grid-cols-4" : cards[tab].length === 2 ? "md:grid-cols-2" : cards[tab].length === 1 ? "max-w-xl mx-auto" : "md:grid-cols-3"}`}>
          {cards[tab].map((c) => (
            <div key={c.title} className="bg-surface border border-surface-hover hover:border-border rounded-2xl p-6 flex flex-col card-hover">
              <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <c.icon size={20} />
              </span>
              <h2 className="text-base font-semibold text-foreground">{c.title}</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed flex-1">{c.desc}</p>
              <Link
                href={c.href}
                className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
              >
                {c.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
        )}

        {/* Invest tab: the three Dhyana investment models */}
        {tab === "invest" && (
          <div className="animate-fade-in space-y-12">
            <p className="text-center text-muted max-w-2xl mx-auto -mt-2">
              Not everyone has land, not everyone has capital, and not everyone has hospitality
              expertise. Dhyana connects all three — pick the model that matches what you bring.
            </p>

            {/* Three models */}
            <div className="grid lg:grid-cols-3 gap-6">
              {investModels.map((m, i) => (
                <div
                  key={m.name}
                  className={`rounded-2xl border p-6 flex flex-col ${
                    i === 2 ? "border-primary/50 bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Model {i + 1}</span>
                    {i === 2 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <Sparkles size={10} /> Flagship
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mt-1.5">{m.name}</h3>
                  <p className="text-xs text-primary italic mt-0.5">“{m.tagline}”</p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {m.forWho.map((w) => (
                      <span key={w} className="text-[10px] px-2.5 py-1 rounded-full bg-surface-hover text-muted">
                        {w}
                      </span>
                    ))}
                  </div>

                  <ul className="mt-4 space-y-2 flex-1">
                    {m.points.map((p) => (
                      <li key={p} className="flex gap-2 text-xs text-muted leading-relaxed">
                        <Check size={13} className="text-sage shrink-0 mt-0.5" /> {p}
                      </li>
                    ))}
                  </ul>

                  {/* Revenue split */}
                  <div className="mt-5 pt-4 border-t border-surface-hover">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">Revenue sharing</p>
                    {m.split ? (
                      <>
                        <div className="flex h-2.5 rounded-full overflow-hidden">
                          <div className="bg-sage" style={{ width: `${m.split.partners}%` }} />
                          <div className="bg-primary" style={{ width: `${m.split.dhyana}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] mt-1.5">
                          <span className="text-sage font-semibold">{m.split.partnersLabel}</span>
                          <span className="text-primary font-semibold">{m.split.dhyanaLabel}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-foreground font-medium">{m.splitNote}</p>
                    )}
                  </div>

                  <Link
                    href="/contact"
                    className={`mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors ${
                      i === 2
                        ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                        : "border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    Apply for this model <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>

            {/* Development process */}
            <div>
              <h3 className="heading-display text-2xl text-foreground text-center">How a project comes alive</h3>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mt-6 pb-2">
                {["Land evaluation", "Investor matching", "Legal agreements", "Design & planning", "Construction", "Curated inspection", "Platform listing", "Revenue"].map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-2 shrink-0">
                    <div className="rounded-xl bg-surface border border-border px-4 py-3 text-center">
                      <p className="text-[10px] font-bold text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                      <p className="text-xs font-medium text-foreground whitespace-nowrap mt-0.5">{s}</p>
                    </div>
                    {i < arr.length - 1 && <ArrowRight size={13} className="text-subtle shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Why Dhyana + who can apply */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> Why partner with Dhyana?
                </h3>
                <ul className="mt-4 grid sm:grid-cols-2 gap-x-5 gap-y-2.5">
                  {["Land evaluation & feasibility", "Architecture & sustainable design", "Branding & photography", "Guest acquisition & marketing", "Operations & revenue management", "Curated quality inspections", "Technology & AI insights", "End-to-end, not just a listing"].map((w) => (
                    <li key={w} className="flex gap-2 text-xs text-muted leading-relaxed">
                      <Check size={13} className="text-sage shrink-0 mt-0.5" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users size={16} className="text-primary" /> Who can apply?
                </h3>
                <div className="flex flex-wrap gap-2 mt-4">
                  {["Landowners", "Individual investors", "Joint venture partners", "Farm owners", "Resort developers", "Hospitality entrepreneurs", "Tourism property owners", "Real estate investors"].map((w) => (
                    <span key={w} className="text-xs px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {w}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted mt-4 leading-relaxed">
                  Invest in a unit, lease your land, or co-build — returns are paid as a share of
                  operating revenue, on the split your model defines.
                </p>
              </div>
            </div>

            {/* CTA banner */}
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/15 via-surface to-surface p-8 md:p-10 text-center">
              <h3 className="heading-display text-2xl md:text-3xl text-foreground">
                Build Together. Grow Together. Earn Together.
              </h3>
              <p className="text-sm text-muted mt-2 max-w-xl mx-auto">
                Own land, hold capital, or dream of a hospitality business — our investment desk
                will map you to the right model.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 mt-6 px-7 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
              >
                Start your hospitality journey <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}

        {/* Influencer tab extra: tiers */}
        {tab === "influencers" && (
          <div className="mt-12 animate-fade-in">
            <h3 className="heading-display text-2xl text-foreground text-center">Partner tiers</h3>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {tiers.map((t, i) => (
                <div key={t.name} className={`rounded-2xl border p-6 ${i === 1 ? "border-primary/50 bg-primary/5" : "border-border bg-surface"}`}>
                  <p className="text-lg font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted mt-0.5">{t.range}</p>
                  <ul className="mt-4 space-y-2">
                    {t.perks.map((p) => (
                      <li key={p} className="flex gap-2 text-sm text-muted">
                        <Check size={14} className="text-sage shrink-0 mt-0.5" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------- Rolling ads ---------- */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-8 mt-20">
        <div className="relative rounded-3xl overflow-hidden border border-primary/25 h-[300px] md:h-[280px]">
          {rollingAds.map((a, i) => (
            <div
              key={a.tag}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === ad ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={a.image} alt={a.headline} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
              <div className="relative z-10 h-full flex flex-col justify-center p-8 md:p-12 max-w-xl">
                <span className="self-start px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white/90 rounded-full border border-white/20 mb-3">
                  {a.tag} · Opportunity
                </span>
                <h3 className="heading-display text-2xl md:text-3xl text-white">{a.headline}</h3>
                <p className="text-sm text-white/80 mt-2 leading-relaxed">{a.copy}</p>
                <Link
                  href={a.href}
                  className="self-start inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
                >
                  {a.cta} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}

          {/* Dots */}
          <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2">
            {rollingAds.map((a, i) => (
              <button
                key={a.tag}
                onClick={() => setAd(i)}
                aria-label={`Show ad: ${a.tag}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === ad ? "w-6 bg-primary" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
          <span className="absolute top-4 right-6 z-20 text-[9px] font-semibold uppercase tracking-wider text-white/60">
            Rolling ads
          </span>
        </div>
      </section>

      {/* ---------- Business chatbot ---------- */}
      <section className="max-w-3xl mx-auto px-6 lg:px-8 mt-20">
        <div className="text-center mb-6">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Sparkles size={13} /> Not sure where to start?
          </span>
          <h2 className="heading-display text-3xl text-foreground mt-2">Ask the business assistant</h2>
        </div>

        <div className="bg-surface border border-border rounded-3xl overflow-hidden">
          <div className="p-5 space-y-4 max-h-[360px] overflow-y-auto">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm px-4 py-2.5">{m.text}</p>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={15} />
                  </span>
                  <div className="max-w-[85%]">
                    <p className="rounded-2xl rounded-tl-sm bg-surface-hover text-foreground text-sm px-4 py-2.5">{m.text}</p>
                    {m.cta && m.href && (
                      <Link
                        href={m.href}
                        className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
                      >
                        {m.cta} <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Quick chips */}
          <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {["How do I list my property?", "Minimum investment?", "Apply as influencer", "Food partner", "Jobs at Dhyana"].map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="shrink-0 text-xs text-muted border border-border rounded-full px-3.5 py-1.5 hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="p-4 border-t border-surface-hover flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question — “how do I invest?”, “list my events”…"
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-full text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              aria-label="Send"
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-subtle mt-3 flex items-center justify-center gap-1.5">
          <Users size={11} /> Prefer a human? Our partner team replies within a day — <Link href="#contact" className="text-primary hover:underline">contact us</Link>.
        </p>
      </section>

      {/* ================= CONTACT ================= */}
      <div className="bg-surface/40 border-t border-surface-hover">
        <ContactSection />
      </div>
    </div>
  );
}
