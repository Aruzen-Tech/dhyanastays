import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ServicesSection, { SpotlightSection } from "./components/ServicesSection";
import DestinationsSection from "./components/DestinationsSection";
import TestimonialsCarousel from "./components/TestimonialsCarousel";
import {
  Search,
  ArrowRight,
  Users,
  CalendarDays,
  Sparkles,
  Bot,
  Clock,
  Leaf,
  Heart,
  ShieldCheck,
} from "lucide-react";
import {
  categories,
  testimonials,
  totalGuestStoryCount,
  blogPosts,
} from "@/lib/mock-data";

// ============================================
// HERO SECTION — Organic Minimalism
// ============================================
function HeroSection() {
  const features = [
    { icon: ShieldCheck, label: "Architect Curated" },
    { icon: Heart, label: "Loved by Guests" },
    { icon: Leaf, label: "Sustainably Built" },
  ];

  return (
    <section className="relative bg-background pt-[70px] md:pt-40 pb-6 md:pb-8 overflow-hidden">
      {/* Decorative soft blobs */}
      <div className="absolute -top-24 -left-32 w-[420px] h-[420px] rounded-full bg-sage/15 blur-3xl pointer-events-none" />
      <div className="absolute top-24 -right-32 w-[380px] h-[380px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-5 sm:gap-14 items-center">
        {/* Left: copy */}
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-surface shadow-organic mb-3 sm:mb-6">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
              India&apos;s Premier Curated Stays
            </span>
          </span>

          <h1 className="heading-organic text-[1.85rem] leading-[1.15] sm:text-5xl lg:text-6xl text-foreground mb-2.5 sm:mb-6 max-w-xl">
            Stays You&apos;ll Fall In Love With{" "}
            <span className="text-primary">From the First Glance</span>
          </h1>

          <p className="text-muted text-sm sm:text-base lg:text-lg max-w-lg mb-3 sm:mb-5 lg:mb-8 leading-relaxed">
            Architect-inspected properties, warm local hospitality, and
            experiences designed to feel like home — curated across India&apos;s
            most beautiful destinations.
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-10">
            <Link
              href="/stays"
              className="px-5 py-2.5 sm:px-7 sm:py-3.5 text-sm font-semibold bg-primary text-primary-foreground rounded-full shadow-organic hover:bg-primary-hover hover:-translate-y-0.5 transition-all"
            >
              Explore Stays
            </Link>
            <Link
              href="/traveller/ai-planner"
              className="flex items-center gap-2 px-5 py-2.5 sm:px-7 sm:py-3.5 text-sm font-semibold bg-surface border border-sage text-sage rounded-full hover:bg-sage hover:text-white transition-all"
            >
              <Sparkles size={16} />
              Plan My Trip with AI
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-md">
            {features.map((f) => (
              <div key={f.label} className="flex flex-col items-start gap-1.5 sm:gap-2.5">
                <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-sage/12 text-sage flex items-center justify-center shrink-0">
                  <f.icon size={16} className="sm:hidden" />
                  <f.icon size={18} className="hidden sm:block" />
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: organic blob image */}
        <div className="relative animate-fade-in">
          <div className="relative rounded-[40px] rounded-tr-[120px] overflow-hidden shadow-organic aspect-[4/5] max-w-[230px] sm:max-w-md mx-auto">
            <img
              src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1400&auto=format&fit=crop"
              alt="A curated Dhyana Stays property nestled in nature"
              fetchPriority="high"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          {/* floating badge */}
          <div className="absolute top-3 left-3 bottom-auto sm:top-auto sm:bottom-6 sm:left-4 bg-surface rounded-[24px] shadow-organic px-3 py-2.5 sm:px-5 sm:py-4 flex items-center gap-2.5 sm:gap-3">
            <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="sm:hidden" />
              <ShieldCheck size={18} className="hidden sm:block" />
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                100% Curated
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted">Every stay inspected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating search bar */}
      <div className="relative max-w-4xl mx-auto px-6 mt-5 sm:mt-8 lg:mt-12">
        <div className="bg-surface rounded-[28px] shadow-organic p-2 animate-fade-in-up">
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 md:px-5 md:py-3 rounded-[18px] bg-background">
              <Search size={18} className="text-subtle shrink-0" />
              <input
                type="text"
                placeholder="Where do you want to go?"
                className="w-full bg-transparent text-foreground placeholder-subtle text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 md:px-5 md:py-3 rounded-[18px] bg-background">
              <CalendarDays size={18} className="text-subtle shrink-0" />
              <span className="text-sm text-subtle whitespace-nowrap">
                Check-in — Check-out
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 md:px-5 md:py-3 rounded-[18px] bg-background">
              <Users size={18} className="text-subtle shrink-0" />
              <span className="text-sm text-subtle">Guests</span>
            </div>
            <Link
              href="/stays"
              className="flex items-center justify-center gap-2 px-8 py-2.5 md:py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-[18px] hover:bg-primary-hover transition-colors whitespace-nowrap"
            >
              <Search size={16} />
              Search
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// AI TRIP PLANNER SECTION
// ============================================
function AiPlannerSection() {
  const promptChips = [
    "Peaceful farm stay near Auroville for 2 days",
    "Family weekend under ₹15,000",
    "Pet-friendly stay with a pool",
  ];
  const preview = [
    { time: "6:30 AM", title: "Sunrise yoga at the stay", state: "done" },
    { time: "11:00 AM", title: "Matrimandir & Auroville tour", state: "now" },
    { time: "4:30 PM", title: "Cycle to Serenity Beach", state: "next" },
  ];

  return (
    <section className="py-6 md:py-12 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="rounded-2xl sm:rounded-[32px] bg-sage overflow-hidden shadow-organic">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 lg:gap-10 items-center p-4 sm:p-6 md:p-12">
            {/* Left: pitch + prompt */}
            <div>
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                <Bot size={14} /> AI Trip Planner
              </span>
              <h2 className="heading-organic text-xl sm:text-3xl lg:text-5xl text-white mt-2 sm:mt-3">
                Tell Us the Trip. We Build the Plan.
              </h2>
              <p className="text-white/80 text-sm sm:text-base mt-2 sm:mt-4 leading-relaxed max-w-lg">
                Describe your dream trip in one line — the AI shortlists stays that
                match your preferences, builds a day-by-day itinerary, tracks you
                through the trip, reschedules when you run late, and keeps SOS help
                one tap away.
              </p>

              {/* Prompt input (opens the planner) */}
              <Link
                href="/traveller/ai-planner"
                className="mt-3.5 sm:mt-7 flex items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-[20px] bg-white p-1.5 pl-4 sm:p-2 sm:pl-5 shadow-organic hover:-translate-y-0.5 transition-all group"
              >
                <Sparkles size={16} className="text-sage shrink-0" />
                <span className="flex-1 text-sm text-neutral-500 truncate">
                  Describe your dream trip — &ldquo;quiet mountain cabin for two, fast wifi…&rdquo;
                </span>
                <span className="px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-2xl group-hover:bg-primary-hover transition-colors whitespace-nowrap">
                  Plan with AI
                </span>
              </Link>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5 sm:mt-4">
                {promptChips.map((c) => (
                  <Link
                    key={c}
                    href="/traveller/ai-planner"
                    className="px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs text-white/85 border border-white/25 rounded-full hover:bg-white/10 transition-colors"
                  >
                    &ldquo;{c}&rdquo;
                  </Link>
                ))}
              </div>
              <p className="text-[11px] text-white/60 mt-3 sm:mt-5 flex items-center gap-1.5">
                <Bot size={11} />
                Also available on every page — tap the AI Planner button at the bottom right.
              </p>
            </div>

            {/* Right: live itinerary preview */}
            <div className="relative">
              <div className="rounded-2xl sm:rounded-[24px] bg-white shadow-organic p-3.5 sm:p-5 max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                  <p className="text-sm font-semibold text-neutral-800">Auroville Escape · Day 2</p>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-sage uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" /> Live tracking
                  </span>
                </div>
                {preview.map((p, i) => (
                  <div key={p.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          p.state === "done"
                            ? "bg-neutral-100 text-neutral-400"
                            : p.state === "now"
                            ? "bg-sage text-white"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {i + 1}
                      </span>
                      {i < preview.length - 1 && <span className="w-px flex-1 bg-neutral-200 my-1" />}
                    </div>
                    <div className={`pb-2.5 sm:pb-4 ${p.state === "done" ? "opacity-50" : ""}`}>
                      <p className="text-[10px] text-neutral-400 tabular-nums flex items-center gap-1">
                        <Clock size={9} /> {p.time}
                        {p.state === "now" && (
                          <span className="ml-1 text-[8px] font-bold uppercase text-sage bg-sage/15 px-1.5 py-0.5 rounded-full">Now</span>
                        )}
                      </p>
                      <p className="text-sm text-neutral-800 font-medium mt-0.5">{p.title}</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl sm:rounded-[14px] bg-terracotta/10 px-3 py-2 sm:px-3.5 sm:py-2.5 text-[11px] text-neutral-500">
                  Running 30 min late — <span className="text-terracotta font-semibold">auto-rescheduled</span> your beach ride &amp; dinner.
                </div>
              </div>
              {/* floating chip */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary shadow-organic text-xs font-semibold text-primary-foreground whitespace-nowrap">
                <Sparkles size={12} /> 96% match with your preferences
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CATEGORIES SECTION
// ============================================
function CategoriesSection() {
  // 3D emoji renders (Microsoft Fluent 3D, MIT licensed) — one per category,
  // swapped in for the old flat line icons.
  const fluent3d = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets";
  const iconMap: Record<string, string> = {
    Home: `${fluent3d}/House/3D/house_3d.png`,
    Sprout: `${fluent3d}/Seedling/3D/seedling_3d.png`,
    Heart: `${fluent3d}/Lotus/3D/lotus_3d.png`,
    Crown: `${fluent3d}/Crown/3D/crown_3d.png`,
    Leaf: `${fluent3d}/Herb/3D/herb_3d.png`,
    Landmark: `${fluent3d}/Classical building/3D/classical_building_3d.png`,
    Laptop: `${fluent3d}/Laptop/3D/laptop_3d.png`,
    HeartHandshake: `${fluent3d}/Two hearts/3D/two_hearts_3d.png`,
    Users: `${fluent3d}/People hugging/3D/people_hugging_3d.png`,
    PawPrint: `${fluent3d}/Paw prints/3D/paw_prints_3d.png`,
    Mountain: `${fluent3d}/Camping/3D/camping_3d.png`,
    Castle: `${fluent3d}/Castle/3D/castle_3d.png`,
  };

  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-end justify-between mb-3 sm:mb-5 lg:mb-14">
          <div>
            <span className="text-xs font-semibold text-sage uppercase tracking-widest">
              Explore
            </span>
            <h2 className="heading-organic text-xl sm:text-3xl lg:text-5xl text-foreground mt-1 sm:mt-2">
              Find Your Perfect Escape
            </h2>
          </div>
          <Link
            href="/stays"
            className="hidden md:flex items-center gap-2 text-sm text-primary hover:underline"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        <div className="relative">
          <div className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-2.5 sm:gap-4 -mx-6 px-6 pb-1 sm:grid sm:grid-cols-3 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none md:grid-cols-4 lg:grid-cols-6 stagger-children">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.slug}
                href={`/stays?category=${cat.slug}`}
                className="group shrink-0 w-[92px] snap-start sm:w-auto sm:shrink p-2.5 sm:p-6 rounded-2xl sm:rounded-[28px] bg-surface card-hover text-center"
              >
                <div className="w-9 h-9 sm:w-16 sm:h-16 mx-auto mb-1.5 sm:mb-4 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    src={iconMap[cat.icon]}
                    alt=""
                    aria-hidden="true"
                    className="w-8 h-8 sm:w-14 sm:h-14 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:rotate-[-4deg]"
                  />
                </div>
                <h3 className="text-[11px] sm:text-sm font-medium text-foreground mb-0.5 sm:mb-1 leading-tight">
                  {cat.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-subtle">{cat.count} stays</p>
              </Link>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
        </div>
      </div>
    </section>
  );
}

// ============================================
// BLOG SECTION
// ============================================
function BlogSection() {
  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-end justify-between mb-3 sm:mb-5 lg:mb-14">
          <div>
            <span className="text-xs font-semibold text-sage uppercase tracking-widest">
              Stories & Inspiration
            </span>
            <h2 className="heading-organic text-xl sm:text-3xl lg:text-5xl text-foreground mt-1 sm:mt-2">
              From the Journal
            </h2>
          </div>
          <Link
            href="/blog"
            className="hidden md:flex items-center gap-2 text-sm text-primary hover:underline"
          >
            All Articles <ArrowRight size={14} />
          </Link>
        </div>

        <div className="relative">
          <div className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-3 md:gap-6 -mx-6 px-6 pb-1 md:grid md:grid-cols-2 md:mx-0 md:px-0 md:pb-0 md:overflow-visible md:snap-none lg:grid-cols-4 stagger-children">
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group shrink-0 w-[175px] snap-start md:w-auto md:shrink rounded-2xl md:rounded-[28px] overflow-hidden bg-surface card-hover"
              >
                <div className="relative h-28 md:h-44 overflow-hidden bg-surface-hover">
                  <img loading="lazy"
                    src={post.image}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 md:p-5">
                  <span className="text-[9px] md:text-[10px] font-medium text-sage uppercase tracking-wider">
                    {post.category}
                  </span>
                  <h3 className="text-xs md:text-sm font-semibold text-foreground mt-1 md:mt-2 mb-1 md:mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-[11px] md:text-xs text-subtle line-clamp-2 mb-1.5 md:mb-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-[10px] md:text-xs text-subtle">
                    <span>{post.date}</span>
                    <span>{post.readTime} read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent md:hidden" />
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTA SECTION
// ============================================
function CTASection() {
  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* For Hosts */}
          <div className="relative rounded-2xl sm:rounded-[32px] overflow-hidden p-5 sm:p-10 lg:p-14 bg-primary shadow-organic group">
            <div className="relative z-10">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">
                For Property Owners
              </span>
              <h3 className="heading-organic text-xl sm:text-2xl lg:text-4xl text-white mt-2 sm:mt-3 mb-2 sm:mb-4">
                List Your Stay
              </h3>
              <p className="text-sm text-white/85 mb-4 sm:mb-8 max-w-sm leading-relaxed">
                Join India&apos;s most prestigious curated stays network. Our
                architecture team will inspect, score, and elevate your property.
              </p>
              <Link
                href="/business"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-primary font-semibold text-sm rounded-full shadow-organic hover:-translate-y-0.5 transition-all"
              >
                Apply as Host <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* For Investors */}
          <div className="relative rounded-2xl sm:rounded-[32px] overflow-hidden p-5 sm:p-10 lg:p-14 bg-sage shadow-organic group">
            <div className="relative z-10">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">
                For Investors
              </span>
              <h3 className="heading-organic text-xl sm:text-2xl lg:text-4xl text-white mt-2 sm:mt-3 mb-2 sm:mb-4">
                Invest in Hospitality
              </h3>
              <p className="text-sm text-white/85 mb-4 sm:mb-8 max-w-sm leading-relaxed">
                Fractional ownership of curated stays with transparent ROI
                tracking, professional management, and monthly revenue
                distribution.
              </p>
              <Link
                href="/investor"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-sage font-semibold text-sm rounded-full shadow-organic hover:-translate-y-0.5 transition-all"
              >
                Explore Projects <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <SpotlightSection />
        <AiPlannerSection />
        <CategoriesSection />
        <ServicesSection />
        <DestinationsSection />
        <TestimonialsCarousel testimonials={testimonials} totalCount={totalGuestStoryCount} />
        <BlogSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
