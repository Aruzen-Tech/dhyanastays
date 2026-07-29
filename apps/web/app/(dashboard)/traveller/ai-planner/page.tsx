"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Users,
  Send,
  Star,
  Check,
  X,
  RefreshCw,
  Bookmark,
  Sunrise,
  Utensils,
  Bike,
  CloudSun,
  Camera,
  Leaf,
  Clock,
  IndianRupee,
  Bot,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { properties } from "@/lib/mock-data";

// ============================================
// AI TRIP PLANNER — fully functional UI (mock AI)
// Prompt-aware plans, staged generation, day tabs,
// editable itinerary with live costs, stay swapping.
// ============================================

type IconKey = "sunrise" | "food" | "map" | "bike" | "sunset" | "camera" | "leaf";
const icons: Record<IconKey, typeof Sunrise> = {
  sunrise: Sunrise,
  food: Utensils,
  map: MapPin,
  bike: Bike,
  sunset: CloudSun,
  camera: Camera,
  leaf: Leaf,
};

interface Activity {
  id: string;
  time: string;
  title: string;
  sub: string;
  cost: number;
  icon: IconKey;
}

interface Plan {
  key: string;
  title: string;
  intro: string;
  staySlug: string;
  altSlugs: string[];
  nights: number;
  match: number;
  tags: string[];
  foodPerGuest: number;
  days: { label: string; items: Activity[] }[];
}

const plans: Plan[] = [
  {
    key: "auroville",
    title: "Auroville Slow-Living Escape",
    intro: "Tiny house living under the trees, cycling to the beach, and food cooked by named local cooks.",
    staySlug: "canopy-tiny-house",
    altSlugs: ["stone-valley-farm-stay", "glass-pavilion"],
    nights: 2,
    match: 96,
    tags: ["Nature", "Slow travel", "Cycling"],
    foodPerGuest: 900,
    days: [
      {
        label: "Day 1",
        items: [
          { id: "a1", time: "7:00 AM", title: "Sunrise yoga on the deck", sub: "Included with your stay", cost: 0, icon: "sunrise" },
          { id: "a2", time: "9:30 AM", title: "Organic farm breakfast", sub: "Meena's Kitchen · cook: Meena Akka", cost: 560, icon: "food" },
          { id: "a3", time: "11:30 AM", title: "Matrimandir & Auroville tour", sub: "Guided · 3 km from stay", cost: 800, icon: "map" },
          { id: "a4", time: "4:30 PM", title: "Cycle to Serenity Beach", sub: "City Trail bicycles · helmet included", cost: 300, icon: "bike" },
          { id: "a5", time: "7:00 PM", title: "Sunset & candlelight dinner", sub: "Curated Food partner · reserved", cost: 1400, icon: "sunset" },
        ],
      },
      {
        label: "Day 2",
        items: [
          { id: "b1", time: "6:30 AM", title: "Silent walk in Sadhana Forest", sub: "Self-guided · trail map in app", cost: 0, icon: "leaf" },
          { id: "b2", time: "10:00 AM", title: "Terracotta pottery workshop", sub: "Riverside studio · 2 hours", cost: 850, icon: "camera" },
          { id: "b3", time: "1:00 PM", title: "Banana-leaf village lunch", sub: "Meena's Kitchen · Village Feast", cost: 1040, icon: "food" },
          { id: "b4", time: "5:00 PM", title: "ECR coastal ride", sub: "Vespa rental · doorstep delivery", cost: 450, icon: "bike" },
        ],
      },
      {
        label: "Day 3",
        items: [
          { id: "c1", time: "7:30 AM", title: "Farewell breakfast basket", sub: "Marc's sourdough & filter coffee", cost: 560, icon: "food" },
          { id: "c2", time: "10:00 AM", title: "Checkout & keepsake photo walk", sub: "Host-guided · 45 min", cost: 0, icon: "camera" },
        ],
      },
    ],
  },
  {
    key: "wellness",
    title: "Palakkad Wellness Reset",
    intro: "Ayurveda, yoga and forest silence at a doctor-led retreat — built to slow your pulse.",
    staySlug: "nila-wellness-retreat",
    altSlugs: ["canopy-tiny-house", "glass-pavilion"],
    nights: 3,
    match: 94,
    tags: ["Wellness", "Ayurveda", "Digital detox"],
    foodPerGuest: 1200,
    days: [
      {
        label: "Day 1",
        items: [
          { id: "w1", time: "6:00 AM", title: "Pranayama by the lotus pond", sub: "Led by Dr. Lakshmi's team", cost: 0, icon: "sunrise" },
          { id: "w2", time: "9:00 AM", title: "Ayurvedic consultation", sub: "Personal dosha assessment", cost: 1500, icon: "leaf" },
          { id: "w3", time: "1:00 PM", title: "Sattvic thali lunch", sub: "Retreat kitchen · no onion-garlic", cost: 760, icon: "food" },
          { id: "w4", time: "4:30 PM", title: "Abhyanga massage", sub: "60 min · warm herbal oils", cost: 2200, icon: "sunset" },
        ],
      },
      {
        label: "Day 2",
        items: [
          { id: "w5", time: "6:30 AM", title: "Forest silence walk", sub: "Phone-free · guided", cost: 0, icon: "leaf" },
          { id: "w6", time: "10:00 AM", title: "Yoga nidra session", sub: "Deep rest practice", cost: 600, icon: "sunrise" },
          { id: "w7", time: "3:00 PM", title: "Spice garden tour", sub: "Pepper, cardamom & vanilla", cost: 500, icon: "map" },
          { id: "w8", time: "7:00 PM", title: "Kerala sadya dinner", sub: "Banana leaf · 12 dishes", cost: 900, icon: "food" },
        ],
      },
      {
        label: "Day 3",
        items: [
          { id: "w9", time: "6:00 AM", title: "Sunrise meditation", sub: "Rooftop shala", cost: 0, icon: "sunrise" },
          { id: "w10", time: "11:00 AM", title: "Take-home herbal kit & checkout", sub: "Personalised by your consultation", cost: 1200, icon: "leaf" },
        ],
      },
    ],
  },
  {
    key: "family",
    title: "Kodaikanal Family Farm Holiday",
    intro: "A working farm stay where kids harvest dinner, feed the animals and sleep early — everyone wins.",
    staySlug: "stone-valley-farm-stay",
    altSlugs: ["canopy-tiny-house", "heritage-courtyard-villa"],
    nights: 2,
    match: 92,
    tags: ["Family friendly", "Farm life", "Kids activities"],
    foodPerGuest: 800,
    days: [
      {
        label: "Day 1",
        items: [
          { id: "f1", time: "8:00 AM", title: "Farm animal morning rounds", sub: "Feed the goats & hens with Priya", cost: 0, icon: "leaf" },
          { id: "f2", time: "10:30 AM", title: "Harvest-your-lunch garden hour", sub: "Kids pick, kitchen cooks", cost: 600, icon: "food" },
          { id: "f3", time: "3:30 PM", title: "Valley viewpoint picnic", sub: "20 min tractor ride", cost: 900, icon: "map" },
          { id: "f4", time: "7:00 PM", title: "Campfire & story night", sub: "Marshmallows included", cost: 400, icon: "sunset" },
        ],
      },
      {
        label: "Day 2",
        items: [
          { id: "f5", time: "7:30 AM", title: "Pine forest cycle loop", sub: "Kids' cycles available", cost: 450, icon: "bike" },
          { id: "f6", time: "12:00 PM", title: "Chettinad cooking class", sub: "Family batch · take the recipes", cost: 1200, icon: "food" },
          { id: "f7", time: "5:00 PM", title: "Golden-hour family photos", sub: "Host photographer · 30 edited shots", cost: 1500, icon: "camera" },
        ],
      },
      {
        label: "Day 3",
        items: [
          { id: "f8", time: "8:30 AM", title: "Farm breakfast & cheese tasting", sub: "From the morning's milk", cost: 500, icon: "food" },
          { id: "f9", time: "10:30 AM", title: "Checkout & farm-shop haul", sub: "Jams, ghee & mountain honey", cost: 0, icon: "map" },
        ],
      },
    ],
  },
];

const pickPlan = (prompt: string): Plan => {
  const p = prompt.toLowerCase();
  if (/(wellness|yoga|ayurved|detox|spa|heal|meditat|peace)/.test(p)) return plans[1];
  if (/(family|kids|children|parents|farm)/.test(p)) return plans[2];
  return plans[0];
};

const parseBudget = (prompt: string): number | null => {
  const m = prompt.replace(/,/g, "").match(/₹?\s?(\d{3,7})\s*(k)?/i);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] ? 1000 : 1);
  return n >= 1000 ? n : null;
};

const stages = [
  "Reading your preferences…",
  "Matching 212 curated stays…",
  "Building day-by-day plans…",
  "Pricing food, rides & experiences…",
  "Polishing your itinerary…",
];

const examplePrompts = [
  "Peaceful wellness retreat with yoga for 2, budget ₹40k",
  "Family farm weekend with the kids under ₹25,000",
  "Quiet tiny house near Auroville, cycling & local food",
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function AITripPlannerPage() {
  const [prompt, setPrompt] = useState("");
  const [guests, setGuests] = useState("2");
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [stage, setStage] = useState(0);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [stayIdx, setStayIdx] = useState(0);
  const [activeDay, setActiveDay] = useState(0);
  const [days, setDays] = useState<Plan["days"]>([]);
  const [saved, setSaved] = useState(false);

  // Staged loading — advances every 650ms, then shows the plan
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setTimeout(() => {
      if (stage >= stages.length - 1) {
        setPhase("result");
      } else {
        setStage((s) => s + 1);
      }
    }, 650);
    return () => clearTimeout(t);
  }, [phase, stage]);

  const generate = (text: string) => {
    const chosen = pickPlan(text);
    setPrompt(text);
    setPlan(chosen);
    setDays(chosen.days.map((d) => ({ ...d, items: [...d.items] })));
    setStayIdx(0);
    setActiveDay(0);
    setSaved(false);
    setStage(0);
    setPhase("loading");
  };

  const removeItem = (dayIdx: number, id: string) =>
    setDays((prev) =>
      prev.map((d, i) => (i === dayIdx ? { ...d, items: d.items.filter((it) => it.id !== id) } : d))
    );

  // ---- derived data for the result ----
  const guestCount = Math.max(1, Number(guests) || 1);
  const stayOptions = plan ? [plan.staySlug, ...plan.altSlugs] : [];
  const stay = plan ? properties.find((x) => x.slug === stayOptions[stayIdx % stayOptions.length]) ?? properties[0] : null;
  const activityCost = days.reduce((sum, d) => sum + d.items.reduce((s, it) => s + it.cost, 0), 0);
  const stayCost = plan && stay ? stay.price * plan.nights : 0;
  const foodCost = plan ? plan.foodPerGuest * guestCount : 0;
  const total = stayCost + activityCost + foodCost;
  const budget = parseBudget(prompt);
  const matchNow = plan ? Math.max(80, plan.match - stayIdx * 5) : 0;

  return (
    <div className="max-w-[860px] mx-auto pb-12">
      <Link
        href="/traveller"
        className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* ================= FORM ================= */}
      {phase === "form" && (
        <div className="animate-fade-in">
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 border border-primary/30 flex items-center justify-center mb-6">
              <Sparkles size={32} className="text-primary" />
            </div>
            <h1 className="heading-display text-3xl md:text-5xl text-foreground mb-4">AI Trip Planner</h1>
            <p className="text-muted max-w-lg mx-auto">
              Describe your dream getaway — the AI matches curated stays, builds your days,
              and prices the whole trip.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                What kind of trip are you dreaming of?
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A peaceful wellness retreat for two with yoga and ayurveda — budget around ₹40k."
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {examplePrompts.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => generate(ex)}
                    className="px-3.5 py-1.5 text-xs text-muted border border-border rounded-full hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    &ldquo;{ex}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Guests</label>
                <div className="relative">
                  <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Your preferences</label>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {["Wellness", "Farm Stays", "Nature"].map((t) => (
                    <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-sage/10 text-sage border border-sage/30">
                      {t}
                    </span>
                  ))}
                  <span className="text-[10px] px-2 py-1 text-subtle">synced from profile</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => prompt.trim() && generate(prompt)}
              disabled={!prompt.trim()}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt.trim() ? (
                <>Generate my trip <Send size={16} /></>
              ) : (
                "Describe your trip to begin"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= LOADING ================= */}
      {phase === "loading" && (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center animate-fade-in">
          <span className="relative mx-auto w-16 h-16 rounded-2xl bg-sage/10 border border-sage/30 flex items-center justify-center">
            <span className="absolute inset-0 rounded-2xl bg-sage/20 animate-ping" />
            <Bot size={28} className="text-sage relative" />
          </span>
          <h2 className="text-lg font-semibold text-foreground mt-6">Planning your trip…</h2>
          <div className="max-w-xs mx-auto mt-5">
            <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sage to-primary transition-all duration-500"
                style={{ width: `${(Math.min(stage + 1, stages.length) / stages.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-3 min-h-[1rem]">
              {stages[Math.min(stage, stages.length - 1)]}
            </p>
          </div>
        </div>
      )}

      {/* ================= RESULT ================= */}
      {phase === "result" && plan && stay && (
        <div className="animate-fade-in-up space-y-6">
          {/* Plan header */}
          <div className="bg-surface border border-primary/30 rounded-2xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                  <Sparkles size={12} /> Curated itinerary · {plan.nights} nights · {guestCount} guests
                </span>
                <h2 className="heading-display text-2xl md:text-3xl text-foreground mt-2">{plan.title}</h2>
                <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">{plan.intro}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {plan.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-surface-hover text-muted">{t}</span>
                  ))}
                </div>
              </div>
              <span className="text-xs font-bold text-sage bg-sage/15 px-3 py-1.5 rounded-full whitespace-nowrap">
                {matchNow}% match
              </span>
            </div>
            <p className="text-[11px] text-subtle mt-4 flex items-center gap-1.5">
              <Bot size={11} className="text-sage" /> Built from: &ldquo;{prompt}&rdquo;
            </p>
          </div>

          {/* Matched stay */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col sm:flex-row">
            <div className="sm:w-56 h-40 sm:h-auto shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={stay.images[0]} alt={stay.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-5 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-subtle">Your matched stay</p>
                  <h3 className="text-base font-semibold text-foreground mt-0.5">{stay.name}</h3>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <MapPin size={10} /> {stay.location.city} ·
                    <Star size={10} className="text-primary fill-primary" /> {stay.rating} ({stay.reviewCount})
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {inr(stay.price)}<span className="text-subtle font-normal text-xs">/night</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link
                  href={`/stays/${stay.slug}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
                >
                  Book this stay <ArrowRight size={12} />
                </Link>
                <button
                  onClick={() => setStayIdx((i) => i + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border rounded-full text-muted hover:text-foreground hover:border-border-light transition-colors"
                >
                  <RefreshCw size={12} /> Swap stay
                </button>
              </div>
            </div>
          </div>

          {/* Itinerary with day tabs */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-surface-hover">
              {days.map((d, i) => (
                <button
                  key={d.label}
                  onClick={() => setActiveDay(i)}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                    activeDay === i
                      ? "border-primary text-primary"
                      : "border-transparent text-subtle hover:text-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-surface-hover">
              {days[activeDay]?.items.map((it) => {
                const Icon = icons[it.icon];
                return (
                  <li key={it.id} className="flex items-center gap-4 px-5 py-3.5 group">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-subtle tabular-nums flex items-center gap-1">
                        <Clock size={9} /> {it.time}
                      </p>
                      <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                      <p className="text-xs text-muted truncate">{it.sub}</p>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                      {it.cost === 0 ? "Free" : inr(it.cost)}
                    </span>
                    <button
                      onClick={() => removeItem(activeDay, it.id)}
                      aria-label={`Remove ${it.title}`}
                      className="w-7 h-7 rounded-lg border border-border text-subtle hover:text-terracotta hover:border-terracotta/50 flex items-center justify-center transition-colors shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </li>
                );
              })}
              {days[activeDay]?.items.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted">
                  A free day — sometimes the best plan is no plan.
                </li>
              )}
            </ul>
          </div>

          {/* Cost breakdown — live */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <IndianRupee size={15} className="text-primary" /> Trip cost · updates as you edit
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-muted">
                <span>{stay.name} · {plan.nights} nights</span>
                <span className="tabular-nums">{inr(stayCost)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Experiences & activities</span>
                <span className="tabular-nums">{inr(activityCost)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Meals estimate · {guestCount} guests</span>
                <span className="tabular-nums">{inr(foodCost)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-surface-hover text-foreground font-bold">
                <span>Total estimate</span>
                <span className="tabular-nums">{inr(total)}</span>
              </div>
            </div>
            {budget && (
              <p className={`text-xs mt-3 flex items-center gap-1.5 ${total <= budget ? "text-sage" : "text-terracotta"}`}>
                {total <= budget ? <Check size={13} /> : <X size={13} />}
                {total <= budget
                  ? `Within your ${inr(budget)} budget — ${inr(budget - total)} to spare.`
                  : `${inr(total - budget)} over your ${inr(budget)} budget — remove an activity or swap the stay.`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/stays/${stay.slug}`}
              className="flex-1 min-w-[200px] py-3.5 text-center text-sm font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
            >
              Book this trip
            </Link>
            <button
              onClick={() => setSaved(true)}
              className={`flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium rounded-xl border transition-colors ${
                saved ? "border-sage/50 bg-sage/10 text-sage" : "border-border text-muted hover:text-foreground"
              }`}
            >
              <Bookmark size={15} /> {saved ? "Saved to My Travel" : "Save plan"}
            </button>
            <button
              onClick={() => generate(prompt)}
              className="flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium border border-border rounded-xl text-muted hover:text-foreground transition-colors"
            >
              <RefreshCw size={15} /> Regenerate
            </button>
            <button
              onClick={() => setPhase("form")}
              className="flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium border border-border rounded-xl text-muted hover:text-foreground transition-colors"
            >
              <Pencil size={15} /> Edit prompt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
