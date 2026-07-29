"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Sprout,
  Leaf,
  TreePine,
  Crown,
  Sparkles,
  Bot,
  Zap,
  Gem,
  Gift,
  PartyPopper,
  Headphones,
  Percent,
  Check,
  X,
  ArrowRight,
  Star,
  Wallet,
  Share2,
  CreditCard,
  Copy,
  QrCode,
  Globe2,
  MapPin,
  PlaneTakeoff,
  IndianRupee,
  Home,
  Heart,
  CheckCircle2,
  Bike,
  UtensilsCrossed,
  Ticket,
  CalendarDays,
  RefreshCw,
  Users,
  UserPlus,
  Building2,
  Receipt,
  ShieldCheck,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// TRAVELLER — Membership
// Seed (free) -> Leaf -> Forest -> Founder's Circle
// (Traveller · Module 9)
// ============================================

type TierId = "seed" | "leaf" | "forest" | "founders";

interface Tier {
  id: TierId;
  name: string;
  emoji: string;
  icon: LucideIcon;
  tagline: string;
  monthly: number | null;
  yearly: number | null;
  badge?: string;
  highlight?: boolean;
  invite?: boolean;
  features: string[];
  cta: string;
}

const tiers: Tier[] = [
  {
    id: "seed",
    name: "Seed",
    emoji: "🌿",
    icon: Sprout,
    tagline: "Best for occasional travellers.",
    monthly: 0,
    yearly: 0,
    badge: "Free Forever",
    features: [
      "Book curated stays",
      "Save wishlist & booking history",
      "Earn reward points (1×)",
      "Basic AI search — 20 searches/month",
      "Basic trip planner",
      "Reviews & ratings",
      "Standard support",
      "Digital invoices",
    ],
    cta: "Get Started",
  },
  {
    id: "leaf",
    name: "Leaf",
    emoji: "🍃",
    icon: Leaf,
    tagline: "Best for regular travellers.",
    monthly: 499,
    yearly: 4999,
    features: [
      "Everything in Seed, plus:",
      "Unlimited AI search & advanced trip planner",
      "Member-only deals & early access to new stays",
      "Priority customer support",
      "Free booking modifications",
      "Food, bike rental & experience discounts",
      "Double reward points (2×)",
      "Birthday travel coupon",
      "Family account sharing",
    ],
    cta: "Upgrade Now",
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌳",
    icon: TreePine,
    tagline: "For frequent travellers & hospitality enthusiasts.",
    monthly: 999,
    yearly: 9999,
    badge: "Most Popular",
    highlight: true,
    features: [
      "Everything in Leaf, plus:",
      "Unlimited AI Concierge + dedicated travel advisor",
      "Priority booking on high-demand dates",
      "Exclusive Architecture Collection access",
      "Complimentary upgrades & free late check-out",
      "VIP experiences & member-only retreats",
      "Triple reward points (3×)",
      "Concierge WhatsApp support",
      "Investor webinar access",
    ],
    cta: "Become Prime",
  },
  {
    id: "founders",
    name: "Founder's Circle",
    emoji: "👑",
    icon: Crown,
    tagline: "Invitation only — for top travellers & investors.",
    monthly: null,
    yearly: null,
    invite: true,
    features: [
      "Everything in Forest, plus:",
      "Personal relationship manager",
      "First access before public launch",
      "Investment & co-ownership opportunities",
      "Founder-only events & retreats",
      "Legacy member pricing, locked for life",
      "Direct line to Dhyana leadership",
      "5× reward points",
    ],
    cta: "Request Invitation",
  },
];

const tierIndex: Record<TierId, number> = { seed: 0, leaf: 1, forest: 2, founders: 3 };

const benefits: { icon: LucideIcon; title: string; copy: string }[] = [
  { icon: Bot, title: "AI Travel Assistant", copy: "Unlimited AI itinerary planning that learns as you travel." },
  { icon: Zap, title: "Priority Booking", copy: "Reserve popular curated stays before they open to the public." },
  { icon: Gem, title: "Exclusive Stays", copy: "Access architecture collections and hidden properties." },
  { icon: Gift, title: "Better Rewards", copy: "Earn up to 3× points on every booking, every service." },
  { icon: PartyPopper, title: "VIP Experiences", copy: "Member-only retreats, workshops and seasonal events." },
  { icon: Sparkles, title: "Personalized Recommendations", copy: "AI learns your travel style and suggests what fits." },
  { icon: Headphones, title: "Premium Support", copy: "Priority response over chat and WhatsApp, day or night." },
  { icon: Percent, title: "Exclusive Offers", copy: "Member-only discounts across food, rentals and experiences." },
];

const redeemOn = [
  { icon: Bike, label: "Bike Rental" },
  { icon: UtensilsCrossed, label: "Food" },
  { icon: Ticket, label: "Experiences" },
  { icon: CalendarDays, label: "Future Booking" },
  { icon: RefreshCw, label: "Membership Renewal" },
];

const walletStats = [
  { icon: Star, label: "Reward Points", value: "3,240 pts" },
  { icon: Percent, label: "Cashback", value: "₹1,240" },
  { icon: Ticket, label: "Coupons", value: "3 active" },
  { icon: Share2, label: "Referral Balance", value: "₹600" },
  { icon: Gift, label: "Gift Cards", value: "₹0" },
  { icon: CreditCard, label: "Membership Credits", value: "₹250" },
];

const analyticsStats = [
  { icon: Globe2, label: "Countries Visited", value: "3" },
  { icon: MapPin, label: "Cities Explored", value: "14" },
  { icon: PlaneTakeoff, label: "Total Trips", value: "9" },
  { icon: IndianRupee, label: "Money Saved", value: "₹18,400" },
  { icon: Star, label: "Points Earned", value: "8,120" },
  { icon: Home, label: "Favourite Stay Type", value: "Farm Stay" },
  { icon: Heart, label: "Favourite Destination", value: "Auroville" },
  { icon: Leaf, label: "Carbon Saved", value: "142 kg" },
  { icon: CheckCircle2, label: "Experiences Completed", value: "11" },
];

const comparison: { feature: string; values: [string, string, string, string] }[] = [
  { feature: "AI Search", values: ["Limited · 20/mo", "Unlimited", "Unlimited", "Unlimited"] },
  { feature: "AI Trip Planner", values: ["Basic", "Advanced", "Concierge", "Concierge"] },
  { feature: "Reward Points", values: ["1×", "2×", "3×", "5×"] },
  { feature: "Member Discounts", values: ["✗", "✓", "✓", "✓"] },
  { feature: "VIP Experiences", values: ["✗", "Limited", "Full", "Full + Private"] },
  { feature: "Priority Support", values: ["✗", "✓", "Dedicated", "Dedicated"] },
  { feature: "Exclusive Properties", values: ["✗", "Some", "All", "All + Pre-launch"] },
  { feature: "Family Sharing", values: ["✗", "✓", "✓", "✓"] },
  { feature: "Expense Split", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Concierge Service", values: ["✗", "✗", "✓", "Personal Manager"] },
];

const familyPerks = ["Invite partner, family & friends", "Shared wishlist & shared trips", "Expense split across the group", "Shared itinerary & group chat"];
const businessPerks = ["GST invoices on every booking", "Corporate booking & approval workflow", "Travel & expense reports", "Dedicated billing contact"];
const studentPerks = ["Extra AI credits every month", "Budget travel deals & hostel collection", "Internship travel support", "Curated learning experiences"];

export default function MembershipPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [tier, setTier] = useState<TierId>("leaf");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function fireToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function chooseTier(t: Tier) {
    if (t.id === tier) return;
    if (t.invite) {
      fireToast("Invitation requested — our team will reach out within 48 hours.");
      return;
    }
    setTier(t.id);
    fireToast(`You're now on ${t.name} ${t.emoji} — welcome aboard!`);
  }

  function copyReferral() {
    const code = "ANANYA500";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentTier = tiers.find((t) => t.id === tier)!;
  const nextTier = tiers[Math.min(tierIndex[tier] + 1, tiers.length - 1)];
  const staysThisYear = 6;
  const staysNeeded = 10;

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      <PageHeader
        title="Membership"
        subtitle="Travel Smarter. Stay Better. Experience More. Unlock AI-powered planning, curated access, and rewards built for how you actually travel."
      />

      {toast && (
        <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-sage/12 border border-sage/30 text-sm text-foreground animate-fade-in">
          <Sparkles size={15} className="text-sage shrink-0" />
          {toast}
        </div>
      )}

      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-sage/15 via-surface to-surface border border-sage/20 p-8 md:p-12 text-center">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-sage/30 mb-5">
          <Crown size={14} className="text-sage" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Dhyana Stays Membership</span>
        </span>
        <h1 className="heading-display text-3xl md:text-5xl text-foreground max-w-3xl mx-auto">
          Travel Smarter. Stay Better. Experience More.
        </h1>
        <p className="text-sm md:text-base text-muted max-w-xl mx-auto mt-4 leading-relaxed">
          Join an exclusive travel community built around curated stays, architecture, experiences and AI —
          not just discounts.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
          <a href="#plans" className="px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors">
            Join Membership
          </a>
          <a href="#comparison" className="px-6 py-3 text-sm font-semibold bg-background border border-border text-foreground rounded-full hover:border-border-light transition-colors">
            Compare Plans
          </a>
        </div>
        <p className="text-xs text-subtle mt-6 flex items-center justify-center gap-1.5">
          You&apos;re currently on <span className="font-semibold text-foreground">{currentTier.emoji} {currentTier.name}</span>
        </p>
      </div>

      {/* ============ PRICING TIERS ============ */}
      <div id="plans" className="scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Membership Plans</h2>
            <p className="text-sm text-muted mt-1">Choose how you travel — change or cancel anytime.</p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 bg-surface-hover rounded-full self-start">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  billing === b ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {b} {b === "yearly" && <span className="opacity-80">· save ~17%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((t) => {
            const isCurrent = t.id === tier;
            const price = billing === "monthly" ? t.monthly : t.yearly;
            const isFounders = t.invite;
            return (
              <div
                key={t.id}
                className={`relative flex flex-col rounded-2xl p-6 border transition-all ${
                  isFounders
                    ? "bg-foreground text-background border-foreground"
                    : t.highlight
                    ? "bg-surface border-primary shadow-[0_0_30px_rgba(228,138,74,0.25)]"
                    : "bg-surface border-border"
                }`}
              >
                {t.badge && !isFounders && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-full whitespace-nowrap">
                    {t.badge}
                  </span>
                )}
                {isCurrent && (
                  <span className={`absolute -top-3 right-4 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap ${isFounders ? "bg-background text-foreground" : "bg-sage text-white"}`}>
                    Your Plan
                  </span>
                )}

                <span className="text-3xl">{t.emoji}</span>
                <h3 className={`text-lg font-bold mt-3 ${isFounders ? "text-background" : "text-foreground"}`}>{t.name}</h3>
                <p className={`text-xs mt-1 ${isFounders ? "text-background/70" : "text-muted"}`}>{t.tagline}</p>

                <div className="mt-5">
                  {isFounders ? (
                    <p className="text-2xl font-bold text-background">Invite Only</p>
                  ) : (
                    <p className={`text-3xl font-bold tabular-nums ${isFounders ? "text-background" : "text-foreground"}`}>
                      ₹{price!.toLocaleString("en-IN")}
                      <span className={`text-xs font-normal ${isFounders ? "text-background/70" : "text-subtle"}`}> /{billing === "monthly" ? "mo" : "yr"}</span>
                    </p>
                  )}
                </div>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {t.features.map((f) => {
                    const isHeader = f.startsWith("Everything in");
                    return (
                      <li key={f} className={`text-xs flex items-start gap-2 ${isHeader ? "font-semibold italic" : ""} ${isFounders ? "text-background/85" : isHeader ? "text-foreground" : "text-muted"}`}>
                        {!isHeader && <Check size={13} className={`shrink-0 mt-0.5 ${isFounders ? "text-background" : "text-sage"}`} />}
                        {f}
                      </li>
                    );
                  })}
                </ul>

                <button
                  onClick={() => chooseTier(t)}
                  disabled={isCurrent}
                  className={`mt-6 w-full py-2.5 text-sm font-semibold rounded-full transition-all ${
                    isCurrent
                      ? isFounders
                        ? "bg-background/20 text-background cursor-default"
                        : "bg-surface-hover text-subtle cursor-default"
                      : isFounders
                      ? "bg-background text-foreground hover:opacity-90"
                      : t.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                      : "bg-sage text-white hover:opacity-90"
                  }`}
                >
                  {isCurrent ? "Your Current Plan" : t.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ BENEFITS ============ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Membership Benefits</h2>
        <p className="text-sm text-muted mb-5">Everything that makes travelling with Dhyana feel effortless.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b) => (
            <div key={b.title} className="bg-surface border border-border rounded-2xl p-5 hover:border-sage/40 transition-colors">
              <span className="w-11 h-11 rounded-xl bg-sage/10 text-sage flex items-center justify-center">
                <b.icon size={20} />
              </span>
              <p className="text-sm font-semibold text-foreground mt-3.5">{b.title}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{b.copy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ REWARD POINTS FLOW ============ */}
      <SectionCard title="How Reward Points Work" icon={Star}>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <div className="px-5 py-3 rounded-xl bg-background border border-border text-sm font-medium text-foreground">Stay 2 Nights</div>
            <ArrowRight size={16} className="text-subtle rotate-90 sm:rotate-0 shrink-0" />
            <div className="px-5 py-3 rounded-xl bg-sage/10 border border-sage/30 text-sm font-semibold text-sage">Earn 500 Points</div>
            <ArrowRight size={16} className="text-subtle rotate-90 sm:rotate-0 shrink-0" />
            <div className="px-5 py-3 rounded-xl bg-primary/10 border border-primary/30 text-sm font-semibold text-primary">Redeem</div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-subtle text-center mt-6 mb-3">Redeem points on</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {redeemOn.map((r) => (
              <span key={r.label} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-background border border-border text-xs text-muted">
                <r.icon size={13} className="text-sage" /> {r.label}
              </span>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ============ MEMBERSHIP DASHBOARD ============ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Your Membership</h2>
        <p className="text-sm text-muted mb-5">Status, digital card, wallet and travel stats — all in one place.</p>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Digital membership card — flips on hover */}
          <div className="[perspective:1200px] h-56">
            <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] hover:[transform:rotateY(180deg)]">
              {/* Front */}
              <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl p-6 bg-gradient-to-br from-sage to-[#3a5a44] text-white flex flex-col justify-between overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
                <div className="absolute -right-2 top-16 w-20 h-20 rounded-full bg-white/10" />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-semibold tracking-wide">DhyanaStays</span>
                  <span className="text-xl">{currentTier.emoji}</span>
                </div>
                <div className="relative">
                  <p className="text-[10px] uppercase tracking-widest text-white/70">Member</p>
                  <p className="text-lg font-bold">Ananya Rao</p>
                  <p className="text-[11px] text-white/70 mt-0.5">DHY-2024-48213 · {currentTier.name} Tier</p>
                </div>
                <div className="relative flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/70">Points</p>
                    <p className="text-base font-bold tabular-nums">3,240</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-white/70">Valid Until</p>
                    <p className="text-xs font-medium">20 Jul 2027</p>
                  </div>
                </div>
              </div>
              {/* Back */}
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl p-6 bg-[#233b2c] text-white flex flex-col items-center justify-center gap-3">
                <QrCode size={64} className="text-white/90" />
                <p className="text-[11px] text-white/70 text-center leading-relaxed px-4">
                  Scan at partner properties for instant recognition & member pricing.
                </p>
                <p className="text-[10px] text-white/50">Member since Mar 2024</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Status row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Current Plan", value: `${currentTier.emoji} ${currentTier.name}` },
                { label: "Expiry Date", value: "20 Jul 2027" },
                { label: "AI Credits", value: "Unlimited" },
                { label: "Active Coupons", value: "3" },
              ].map((s) => (
                <div key={s.label} className="bg-surface border border-border rounded-2xl p-4">
                  <p className="text-[11px] text-muted">{s.label}</p>
                  <p className="text-base font-bold text-foreground mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Progress ladder */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                {tiers.map((t, i) => {
                  const reached = i <= tierIndex[tier];
                  return (
                    <div key={t.id} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && (
                        <span
                          className={`absolute right-1/2 top-4 h-0.5 w-full -z-0 ${
                            i <= tierIndex[tier] ? "bg-sage" : "bg-border"
                          }`}
                        />
                      )}
                      <span
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          reached ? "bg-sage border-sage text-white" : "bg-background border-border text-subtle"
                        }`}
                      >
                        <t.icon size={14} />
                      </span>
                      <span className={`text-[10px] mt-1.5 font-medium ${reached ? "text-foreground" : "text-subtle"}`}>{t.name}</span>
                    </div>
                  );
                })}
              </div>
              {tier !== "founders" && (
                <>
                  <div className="h-2 rounded-full bg-surface-hover overflow-hidden mt-5">
                    <div className="h-full rounded-full bg-sage" style={{ width: `${(staysThisYear / staysNeeded) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-muted mt-2">
                    {staysThisYear} of {staysNeeded} qualifying stays this year —{" "}
                    <span className="text-sage font-medium">{staysNeeded - staysThisYear} more unlocks {nextTier.name} {nextTier.emoji}</span>
                  </p>
                </>
              )}
            </div>

            {/* Travel Wallet */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-2.5 flex items-center gap-1.5">
                <Wallet size={13} /> Travel Wallet
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {walletStats.map((w) => (
                  <div key={w.label} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted">{w.label}</p>
                      <w.icon size={13} className="text-primary" />
                    </div>
                    <p className="text-base font-bold text-foreground mt-1 tabular-nums">{w.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Travel analytics */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-2.5">Travel Analytics</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {analyticsStats.map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-sage/10 text-sage flex items-center justify-center shrink-0">
                  <s.icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted truncate">{s.label}</p>
                  <p className="text-sm font-bold text-foreground truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ FAMILY / BUSINESS / STUDENT ============ */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <span className="w-11 h-11 rounded-xl bg-sage/10 text-sage flex items-center justify-center">
            <Users size={20} />
          </span>
          <h3 className="text-base font-semibold text-foreground mt-3.5">Family Membership</h3>
          <p className="text-xs text-muted mt-1">Available on Leaf & above.</p>
          <ul className="mt-4 space-y-2">
            {familyPerks.map((p) => (
              <li key={p} className="text-xs text-muted flex items-start gap-2">
                <Check size={12} className="text-sage shrink-0 mt-0.5" /> {p}
              </li>
            ))}
          </ul>
          <button
            onClick={() => fireToast("Invite sent — family members can now join your plan.")}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-border rounded-full text-foreground hover:border-sage/50 hover:text-sage transition-colors"
          >
            <UserPlus size={13} /> Invite Family
          </button>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 size={20} />
          </span>
          <h3 className="text-base font-semibold text-foreground mt-3.5">Business Traveller</h3>
          <p className="text-xs text-muted mt-1">For work trips & corporate accounts.</p>
          <ul className="mt-4 space-y-2">
            {businessPerks.map((p) => (
              <li key={p} className="text-xs text-muted flex items-start gap-2">
                <Check size={12} className="text-sage shrink-0 mt-0.5" /> {p}
              </li>
            ))}
          </ul>
          <button
            onClick={() => fireToast("Business mode enabled — GST invoices now on by default.")}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-border rounded-full text-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Receipt size={13} /> Enable Business Mode
          </button>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <span className="w-11 h-11 rounded-xl bg-sage/10 text-sage flex items-center justify-center">
            <GraduationCap size={20} />
          </span>
          <h3 className="text-base font-semibold text-foreground mt-3.5">Student Membership</h3>
          <p className="text-xs text-muted mt-1">Special pricing with valid student ID.</p>
          <ul className="mt-4 space-y-2">
            {studentPerks.map((p) => (
              <li key={p} className="text-xs text-muted flex items-start gap-2">
                <Check size={12} className="text-sage shrink-0 mt-0.5" /> {p}
              </li>
            ))}
          </ul>
          <button
            onClick={() => fireToast("Student ID submitted — verification usually takes under 24 hours.")}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-border rounded-full text-foreground hover:border-sage/50 hover:text-sage transition-colors"
          >
            <BookOpen size={13} /> Verify Student ID
          </button>
        </div>
      </div>

      {/* ============ REFERRAL PROGRAM ============ */}
      <SectionCard title="Referral Program" icon={Share2}>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center mb-6">
            <div className="px-5 py-3 rounded-xl bg-background border border-border text-sm font-medium text-foreground flex items-center gap-2">
              <UserPlus size={14} className="text-sage" /> Invite Friends
            </div>
            <ArrowRight size={16} className="text-subtle rotate-90 sm:rotate-0 shrink-0" />
            <div className="px-5 py-3 rounded-xl bg-background border border-border text-sm font-medium text-foreground">Friend Books</div>
            <ArrowRight size={16} className="text-subtle rotate-90 sm:rotate-0 shrink-0" />
            <div className="px-5 py-3 rounded-xl bg-sage/10 border border-sage/30 text-sm font-semibold text-sage">You Earn</div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-subtle text-center mb-3">You earn</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {["Reward Points", "Cashback", "Coupons", "Free Membership Months"].map((p) => (
              <span key={p} className="px-3.5 py-2 rounded-full bg-background border border-border text-xs text-muted">{p}</span>
            ))}
          </div>
          <div className="max-w-sm mx-auto flex items-center gap-2 p-2 pl-5 rounded-full bg-background border border-border">
            <span className="flex-1 text-sm font-mono font-semibold text-foreground tracking-wider">ANANYA500</span>
            <button
              onClick={copyReferral}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-sage text-white rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ============ COMPARISON TABLE ============ */}
      <div id="comparison" className="scroll-mt-20">
        <h2 className="text-lg font-semibold text-foreground mb-1">Compare Plans</h2>
        <p className="text-sm text-muted mb-5">Everything, side by side.</p>
        <div className="bg-surface border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-surface-hover">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-subtle uppercase tracking-wider">Feature</th>
                {tiers.map((t) => (
                  <th key={t.id} className="px-4 py-3.5 text-center text-xs font-semibold text-foreground whitespace-nowrap">
                    {t.emoji} {t.name}
                    {t.id === tier && <StatusPill tone="sage">Yours</StatusPill>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature} className="border-b border-surface-hover last:border-0">
                  <td className="px-5 py-3.5 text-muted whitespace-nowrap">{row.feature}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="px-4 py-3.5 text-center">
                      {v === "✓" ? (
                        <Check size={15} className="text-sage mx-auto" />
                      ) : v === "✗" ? (
                        <X size={14} className="text-subtle/50 mx-auto" />
                      ) : (
                        <span className="text-xs text-foreground font-medium whitespace-nowrap">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ FINAL CTA ============ */}
      <div className="rounded-[32px] bg-sage p-10 md:p-14 text-center">
        <ShieldCheck size={28} className="text-white/80 mx-auto mb-4" />
        <h2 className="heading-display text-2xl md:text-4xl text-white">Join the Dhyana Stays Community</h2>
        <p className="text-sm md:text-base text-white/80 mt-3 max-w-lg mx-auto">
          Travel Smarter. Stay Better. Experience More.
        </p>
        <a
          href="#plans"
          className="inline-flex items-center gap-2 mt-7 px-7 py-3.5 text-sm font-semibold bg-white text-sage rounded-full hover:opacity-90 transition-opacity"
        >
          Explore Membership Plans <ArrowRight size={15} />
        </a>
      </div>
    </div>
  );
}
