import Link from "next/link";
import ContactSection from "@/app/components/ContactSection";
import {
  Leaf,
  Heart,
  Shield,
  Users,
  Sparkles,
  ArrowRight,
  Home,
  HardHat,
  Hotel,
  TrendingUp,
  Bot,
  MapPin,
  UtensilsCrossed,
  PartyPopper,
  Bike,
  Globe,
  Star,
  Building,
  Camera,
  ShieldCheck,
  X,
  Check,
  Quote,
  ChevronDown,
  Compass,
  BarChart3,
  Megaphone,
  Eye,
  Layers,
  Filter,
  ImageOff,
  FileQuestion,
  Coffee,
  CloudSun,
  CalendarClock,
} from "lucide-react";
import { testimonials, platformStats } from "@/lib/mock-data";

// ============================================
// ABOUT US — storytelling page
// Hero → story → problem → different → ecosystem
// → philosophy → services → models → values →
// vision → team → impact → testimonials → FAQ → CTA
// ============================================

const heroStats = [
  { value: "212", label: "Curated Properties" },
  { value: "28,400+", label: "Happy Travellers" },
  { value: "45", label: "Destinations" },
  { value: "4.82", label: "Average Rating" },
];

const problems = [
  { icon: Eye, title: "Discovery is broken", text: "Endless listings with inconsistent quality — ratings that rarely reflect the real experience." },
  { icon: Camera, title: "Hidden gems stay hidden", text: "Beautiful properties go unnoticed without professional design, branding or marketing." },
  { icon: Home, title: "Land without know-how", text: "Landowners hold excellent locations but lack hospitality expertise to build on them." },
  { icon: TrendingUp, title: "Capital without trust", text: "Investors have money but struggle to find transparent, professionally run projects." },
  { icon: Building, title: "Fragmented services", text: "Entrepreneurs juggle separate agencies for design, operations, marketing and tech." },
  { icon: Users, title: "Communities left out", text: "Local artisans, cooks and guides receive little visibility from big platforms." },
];

const comparison = {
  traditional: ["Multiple websites", "Endless searching", "Generic listings", "Manual planning", "Scattered information", "Time-consuming"],
  dhyana: ["Curated stays only", "Purpose-based search", "Authentic property stories", "AI-powered itinerary", "Personalized recommendations", "Everything in one platform"],
};

const storyOneBefore = [
  { icon: Layers, text: "Ten tabs open — booking sites, Maps, YouTube, blogs, socials" },
  { icon: Filter, text: "Confusing filters that don't match how you actually search" },
  { icon: ImageOff, text: "Fake or outdated photos that don't match the property" },
  { icon: FileQuestion, text: "No story, no context — just a generic listing" },
];

const storyOneAfter = [
  "Property story, architecture & why it was built",
  "Verified amenities & curated photography",
  "Nearby attractions & host introduction",
  "A sustainability & guest-experience score",
];

const travelPurposes = ["Family Gathering", "Nature", "Weekend Getaway", "Large Social Space"];

const storyTwoBefore = [
  { icon: MapPin, text: "Google Maps for routes, Instagram for ideas" },
  { icon: Coffee, text: "Blogs and YouTube for restaurants & cafés" },
  { icon: CloudSun, text: "A separate app just to check the weather" },
  { icon: CalendarClock, text: "Hours spent stitching it all into a schedule" },
];

const storyTwoAfter = [
  "Curated stays, attractions & restaurants in one plan",
  "Daily schedule with weather, routes & bike rentals",
  "Local events & experiences matched to your interests",
  "Auto-updates the moment plans or weather change",
];

const plannerInputs = ["Destination", "Travel Dates", "Budget", "Interests"];

const ecosystem = [
  "Curated Stay Marketplace", "Hospitality Consultancy", "Architecture & Master Planning", "Interior Design",
  "Landscape Design", "Property Development", "Quality Inspection", "Investor Collaboration",
  "AI Trip Planning", "Local Experiences", "Food Discovery", "Community Tourism",
  "Technology Platform", "Revenue Management", "Marketing Support", "Business Analytics",
];

const philosophy = [
  "Architectural quality", "Interior design", "Guest experience", "Sustainability", "Hospitality standards",
  "Safety", "Local culture", "Authenticity", "Maintenance quality", "Operational readiness",
];

const services = [
  { icon: Home, label: "Curated Stays", href: "/stays" },
  { icon: HardHat, label: "Architecture Consultancy", href: "/consultancy/architecture" },
  { icon: Hotel, label: "Hospitality Consultancy", href: "/consultancy/hospitality" },
  { icon: TrendingUp, label: "Investor Network", href: "/business" },
  { icon: MapPin, label: "Landowner Partnership", href: "/business" },
  { icon: Building, label: "Property Development", href: "/business" },
  { icon: Bot, label: "AI Trip Planner", href: "/traveller/ai-planner" },
  { icon: Compass, label: "Local Experiences", href: "/experiences" },
  { icon: UtensilsCrossed, label: "Food Marketplace", href: "/food" },
  { icon: PartyPopper, label: "Event Hosting", href: "/business" },
  { icon: Bike, label: "Bike Rentals", href: "/bike-rental" },
  { icon: Globe, label: "Community Tourism", href: "/experiences" },
];

const models = [
  { name: "Landowner Partnership", text: "Develop your property with our architecture, branding, marketing and operations. We earn a management revenue share (~30%) — the rest is yours." },
  { name: "Land Lease Program", text: "Lease suitable land for curated developments and earn stable, fully passive lease income without operating anything." },
  { name: "Joint Investment Partnership", text: "We connect landowners with investors, build the project and run it end-to-end on a shared revenue model (Dhyana 40–50%)." },
];

const values = [
  { icon: Heart, title: "Authentic Experiences", text: "Real places, real people, real stories — never copy-paste hospitality." },
  { icon: Leaf, title: "Sustainable Development", text: "Solar, rainwater, local materials — we build with the land, not on it." },
  { icon: Star, title: "Quality Before Quantity", text: "212 curated stays beat 20,000 unchecked listings, every time." },
  { icon: Sparkles, title: "Innovation Through Technology", text: "AI planning, live tracking and analytics working quietly in the background." },
  { icon: Shield, title: "Transparency", text: "Inspections, revenue splits and reports everyone can see and trust." },
  { icon: Users, title: "Community Growth", text: "Local cooks, artisans and guides earn alongside every stay." },
];

const vision = [
  { phase: "Now", title: "Launch India's curated hospitality ecosystem", text: "Stays, consultancy, investments, food, events and rentals — one platform, live." },
  { phase: "Next", title: "300 curated stays across destinations", text: "Deepening Tamil Nadu, Kerala, Karnataka, Pondicherry and Goa." },
  { phase: "Future", title: "National expansion, AI-first", text: "AI-powered hospitality services in every major Indian destination." },
  { phase: "Long-term", title: "A global hospitality technology platform", text: "Curated stays, consulting, investments and white-label solutions worldwide." },
];

const team = [
  { name: "Founder & CEO", person: "Naveen V.", avatar: "https://i.pravatar.cc/150?img=12", note: "Architect turned hospitality builder" },
  { name: "Co-Founder", person: "Dhyana Priya", avatar: "https://i.pravatar.cc/150?img=47", note: "Hospitality & guest experience" },
  { name: "Architecture Team", person: "Ar. Kavya Menon", avatar: "https://i.pravatar.cc/150?img=44", note: "Master planning & sustainable design" },
  { name: "Hospitality Team", person: "Rohan Das", avatar: "https://i.pravatar.cc/150?img=59", note: "Operations & partner success" },
  { name: "Technology Team", person: "Arjun S.", avatar: "https://i.pravatar.cc/150?img=68", note: "Platform, AI & analytics" },
  { name: "Operations Team", person: "Divya Krishnan", avatar: "https://i.pravatar.cc/150?img=43", note: "Regional quality & inspections" },
  { name: "Marketing Team", person: "Aditya Sharma", avatar: "https://i.pravatar.cc/150?img=14", note: "Brand, campaigns & community" },
];

const impact = [
  { value: "212", label: "Curated Properties" },
  { value: `${platformStats.totalGuests.toLocaleString("en-IN")}+`, label: "Happy Travellers" },
  { value: "140+", label: "Hospitality Partners" },
  { value: "38", label: "Local Communities Supported" },
  { value: `${platformStats.totalDestinations}`, label: "Tourism Destinations" },
  { value: "64", label: "Investor Partnerships" },
  { value: `${platformStats.sustainableStays}`, label: "Sustainable Projects" },
  { value: "320+", label: "Local Experiences Offered" },
];

const faqs = [
  { q: "What makes Dhyana Stays different?", a: "We're not a listing site — we're a hospitality ecosystem. Every property is inspected before it goes live, and we stay involved with architecture, operations, marketing and technology for the life of the stay." },
  { q: "How are properties selected?", a: "Each stay is scored on ten criteria — from architectural quality and safety to authenticity and operational readiness. Only properties that clear our systematic checks and an on-site curated inspection earn the badge." },
  { q: "Can I list my property?", a: "Yes — start from Business → Host & List. You'll submit details, photos and papers; our checks run within 24 hours, then a manager calls you to approve the unit for listing." },
  { q: "How can I become an investor?", a: "Choose from three models — Landowner Partnership, Land Leasing, or Joint Investment — under Business → Invest. Our investment desk maps you to the right one and returns are paid as a share of operating revenue." },
  { q: "Do you provide hospitality consultancy?", a: "Yes — architecture (master plans, drawings, BOQ, site supervision) and hospitality (business plans, revenue models, branding, operations manuals) consultancies are both bookable online." },
  { q: "How does the inspection process work?", a: "After your listing request clears the systematic pass, a regional inspector visits within 7 days, scores the property on our checklist, and only Approved & Published units ever appear in discovery." },
];

const finalCtas = [
  { label: "Book a Stay", href: "/stays", primary: true },
  { label: "Become a Host", href: "/become-a-host", primary: false },
  { label: "Partner With Us", href: "/business", primary: false },
  { label: "Invest With Us", href: "/business", primary: false },
  { label: "Contact Our Team", href: "#contact", primary: false },
];

export default function AboutPage() {
  return (
    <div className="bg-background">
      {/* ================= HERO ================= */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden -mt-[72px] pt-[72px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2400&auto=format&fit=crop"
          alt="A curated Dhyana Stays destination at dusk"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative z-10 max-w-[900px] mx-auto px-6 text-center py-24">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">About Dhyana Stays</span>
          <h1 className="heading-display text-4xl md:text-6xl text-white mt-4 leading-tight">
            More Than a Booking Platform. We Build Extraordinary Hospitality Experiences.
          </h1>
          <p className="text-white/80 mt-6 max-w-2xl mx-auto leading-relaxed">
            A curated hospitality ecosystem where architecture, sustainability, technology and
            authentic experiences come together — creating memorable destinations for travellers
            while helping landowners and investors build profitable hospitality businesses.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a href="#story" className="px-7 py-3.5 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors">
              Explore Our Story
            </a>
            <Link href="/business" className="px-7 py-3.5 text-sm font-semibold border border-white/40 text-white rounded-full hover:bg-white/10 transition-colors">
              Become a Partner
            </Link>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14">
            {heroStats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-4">
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{s.value}</p>
                <p className="text-[11px] text-white/70 mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= OUR STORY ================= */}
      <section id="story" className="py-24 scroll-mt-16">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Our Story</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">Why We Started Dhyana Stays</h2>
            <div className="space-y-4 mt-6 text-muted leading-relaxed text-sm md:text-base">
              <p>
                Travel has become commercialized. Most platforms focus on filling rooms and maximizing
                listings — making it hard for travellers to find truly meaningful places, while beautiful
                properties stay invisible without professional design, branding or operations.
              </p>
              <p>
                As architects and hospitality consultants, we saw this gap firsthand: incredible locations
                that never became destinations, and travellers who couldn&apos;t find experiences they could trust.
              </p>
              <p className="text-foreground font-medium">
                Dhyana Stays was created to bridge that gap — a platform where every stay is curated, every
                destination tells a story, and landowners, investors, architects and hospitality professionals
                build destinations together that are memorable, sustainable and financially successful.
              </p>
            </div>
          </div>
          {/* Collage */}
          <div className="relative h-[420px] hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=600&q=75" alt="Architecture in nature" className="absolute top-0 left-0 w-[62%] h-[58%] object-cover rounded-2xl rotate-[-2deg] shadow-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&q=75" alt="Curated interiors" className="absolute top-[30%] right-0 w-[52%] h-[52%] object-cover rounded-2xl rotate-[3deg] shadow-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src="https://images.unsplash.com/photo-1502786129293-79981df4e689?w=600&q=75" alt="Travellers in the hills" className="absolute bottom-0 left-[12%] w-[48%] h-[42%] object-cover rounded-2xl rotate-[-1deg] shadow-xl" />
          </div>
        </div>
      </section>

      {/* ================= THE PROBLEM ================= */}
      <section className="py-24 bg-surface/40">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">The Problem</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">
              The Hospitality Industry Has a Discovery Problem
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {problems.map((p) => (
              <div key={p.title} className="bg-surface border border-surface-hover rounded-2xl p-6 card-hover">
                <span className="w-10 h-10 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center mb-4">
                  <p.icon size={18} />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                <p className="text-xs text-muted mt-2 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>

          {/* ============ THE PROBLEMS WE SOLVE — before/after storytelling ============ */}
          <div className="text-center mt-20 mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">The Problems We Solve</span>
            <h3 className="heading-display text-2xl lg:text-4xl text-foreground mt-2">
              From Confusing Search to Complete Confidence
            </h3>
          </div>

          {/* Story 1 — Finding the Perfect Stay */}
          <div>
            <div className="text-center mb-6">
              <span className="text-[11px] font-semibold text-sage uppercase tracking-widest">Story 1 · Discovery</span>
              <h4 className="text-xl lg:text-2xl font-semibold text-foreground mt-1.5">Finding the Perfect Stay</h4>
            </div>
            <div className="grid lg:grid-cols-2 gap-5 items-stretch">
              {/* Before */}
              <div className="rounded-2xl border border-border bg-surface p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-terracotta/10 text-terracotta text-[11px] font-semibold uppercase tracking-wider mb-5">
                  The Current Reality
                </span>
                <ul className="space-y-3 flex-1">
                  {storyOneBefore.map((p) => (
                    <li key={p.text} className="flex gap-3 text-sm text-muted">
                      <p.icon size={16} className="text-terracotta shrink-0 mt-0.5" /> {p.text}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-subtle italic mt-6 pt-5 border-t border-border">
                  &ldquo;Finding the perfect stay shouldn&apos;t require searching ten different websites.&rdquo;
                </p>
              </div>
              {/* After */}
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-wider mb-5">
                  The Dhyana Stays Experience
                </span>
                <div className="flex flex-wrap gap-2 mb-5">
                  {travelPurposes.map((p) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-surface border border-primary/30 text-xs font-medium text-foreground">
                      {p}
                    </span>
                  ))}
                </div>
                <ul className="space-y-3 flex-1">
                  {storyOneAfter.map((text) => (
                    <li key={text} className="flex gap-3 text-sm text-foreground">
                      <Check size={16} className="text-sage shrink-0 mt-0.5" /> {text}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-foreground font-medium mt-6 pt-5 border-t border-primary/20">
                  &ldquo;We don&apos;t just help you find a room — we help you discover the perfect experience.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Story 2 — AI Trip Planner */}
          <div className="mt-14">
            <div className="text-center mb-6">
              <span className="text-[11px] font-semibold text-sage uppercase tracking-widest">Story 2 · Planning</span>
              <h4 className="text-xl lg:text-2xl font-semibold text-foreground mt-1.5">AI Trip Planner</h4>
            </div>
            <div className="grid lg:grid-cols-2 gap-5 items-stretch">
              {/* Before */}
              <div className="rounded-2xl border border-border bg-surface p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-terracotta/10 text-terracotta text-[11px] font-semibold uppercase tracking-wider mb-5">
                  Traditional Travel Planning
                </span>
                <ul className="space-y-3 flex-1">
                  {storyTwoBefore.map((p) => (
                    <li key={p.text} className="flex gap-3 text-sm text-muted">
                      <p.icon size={16} className="text-terracotta shrink-0 mt-0.5" /> {p.text}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-subtle italic mt-6 pt-5 border-t border-border">
                  &ldquo;Planning your trip becomes a full-time project before your holiday even begins.&rdquo;
                </p>
              </div>
              {/* After */}
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-7 flex flex-col">
                <span className="inline-flex self-start px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-wider mb-5">
                  AI Trip Planner
                </span>
                <div className="flex flex-wrap gap-2 mb-5">
                  {plannerInputs.map((p) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-surface border border-primary/30 text-xs font-medium text-foreground">
                      {p}
                    </span>
                  ))}
                </div>
                <ul className="space-y-3 flex-1">
                  {storyTwoAfter.map((text) => (
                    <li key={text} className="flex gap-3 text-sm text-foreground">
                      <Check size={16} className="text-sage shrink-0 mt-0.5" /> {text}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-foreground font-medium mt-6 pt-5 border-t border-primary/20">
                  &ldquo;One intelligent planner. One personalized journey. Zero planning stress.&rdquo;
                </p>
                <Link
                  href="/traveller/ai-planner"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-4"
                >
                  Try the AI Planner <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>

          {/* Comparison infographic */}
          <div className="grid md:grid-cols-2 gap-6 mt-16">
            <div className="rounded-2xl border border-border bg-surface p-7">
              <p className="text-sm font-semibold text-muted mb-5">Traditional Travel</p>
              <ul className="space-y-3">
                {comparison.traditional.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm text-muted">
                    <X size={15} className="text-terracotta shrink-0 mt-0.5" /> {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-7">
              <p className="text-sm font-semibold text-primary mb-5">Dhyana Stays</p>
              <ul className="space-y-3">
                {comparison.dhyana.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm text-foreground">
                    <Check size={15} className="text-sage shrink-0 mt-0.5" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Closing hero message */}
          <div className="mt-8 rounded-[28px] bg-gradient-to-br from-primary to-primary-hover p-8 md:p-12 text-center">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-3">
              We Are Not Building Another Booking Platform
            </p>
            <p className="heading-display text-xl md:text-3xl text-white leading-snug max-w-3xl mx-auto">
              We are building the future of curated travel — where discovering the perfect stay and
              planning the perfect journey happen together, in one intelligent ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* ================= OUR SOLUTION / ECOSYSTEM ================= */}
      <section className="py-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Our Solution</span>
          <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">A Complete Hospitality Ecosystem</h2>
          <p className="text-muted mt-4 max-w-2xl mx-auto">
            Not isolated services — one connected system where every part strengthens the others.
          </p>
          <div className="relative mt-12">
            <div className="flex flex-wrap justify-center gap-2.5">
              {ecosystem.map((e, i) => (
                <span
                  key={e}
                  className={`px-4 py-2.5 rounded-full text-xs font-medium border transition-colors ${
                    i % 4 === 0
                      ? "bg-primary/10 text-primary border-primary/30"
                      : i % 4 === 1
                      ? "bg-sage/10 text-sage border-sage/30"
                      : "bg-surface text-muted border-border"
                  }`}
                >
                  {e}
                </span>
              ))}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-hover text-primary-foreground text-sm font-semibold">
              <Sparkles size={15} /> All connected through one platform
            </div>
          </div>
        </div>
      </section>

      {/* ================= PHILOSOPHY ================= */}
      <section className="py-24 bg-surface/40">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-8 text-center">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Curated Stay Philosophy</span>
          <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">Every Stay Must Earn Its Place</h2>
          <p className="text-muted mt-4 max-w-xl mx-auto">
            Properties are evaluated on ten dimensions — only those that meet the standard join the platform.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-10">
            {philosophy.map((p) => (
              <span key={p} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-sm text-muted">
                <ShieldCheck size={13} className="text-sage" /> {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section className="py-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Our Services</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">Everything Hospitality, One Roof</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
            {services.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="group bg-surface border border-surface-hover hover:border-primary/40 rounded-2xl p-5 flex items-center gap-3 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.icon size={17} />
                </span>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PARTNERSHIP MODELS ================= */}
      <section className="py-24 bg-surface/40">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Partnership Models</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">
              Land + Capital + Dhyana = Shared Success
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {models.map((m, i) => (
              <div key={m.name} className={`rounded-2xl border p-6 ${i === 2 ? "border-primary/50 bg-primary/5" : "border-border bg-surface"}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Model {i + 1}</span>
                <h3 className="text-base font-semibold text-foreground mt-1">{m.name}</h3>
                <p className="text-sm text-muted mt-3 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/business" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              Full details & applications on the Business page <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= VALUES ================= */}
      <section className="py-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Our Values</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">What We Refuse to Compromise</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {values.map((v) => (
              <div key={v.title} className="bg-surface border border-surface-hover rounded-2xl p-6 card-hover">
                <span className="w-10 h-10 rounded-xl bg-sage/10 text-sage flex items-center justify-center mb-4">
                  <v.icon size={18} />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{v.title}</h3>
                <p className="text-xs text-muted mt-2 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= VISION TIMELINE ================= */}
      <section className="py-24 bg-surface/40">
        <div className="max-w-[900px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Our Vision</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">Where This Is Going</h2>
          </div>
          <div>
            {vision.map((v, i) => (
              <div key={v.phase} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-surface border border-border text-muted"}`}>
                    {v.phase}
                  </span>
                  {i < vision.length - 1 && <span className="w-px flex-1 bg-border my-2" />}
                </div>
                <div className="pb-10">
                  <h3 className="text-base font-semibold text-foreground">{v.title}</h3>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TEAM ================= */}
      <section className="py-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Meet the Team</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">The People Behind the Places</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {team.map((t) => (
              <div key={t.name} className="bg-surface border border-surface-hover rounded-2xl p-5 text-center card-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={t.avatar} alt={t.person} className="w-16 h-16 rounded-2xl object-cover mx-auto border-2 border-primary/30" />
                <p className="text-sm font-semibold text-foreground mt-3">{t.person}</p>
                <p className="text-[11px] text-primary mt-0.5">{t.name}</p>
                <p className="text-[11px] text-muted mt-1.5">{t.note}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="w-7 h-7 rounded-full bg-surface-hover text-muted flex items-center justify-center hover:text-primary transition-colors cursor-pointer">
                    <Globe size={12} />
                  </span>
                  <span className="w-7 h-7 rounded-full bg-surface-hover text-muted flex items-center justify-center hover:text-primary transition-colors cursor-pointer">
                    <Megaphone size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= IMPACT ================= */}
      <section className="py-24 bg-surface/40">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Our Impact</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">Numbers That Tell the Story</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {impact.map((s) => (
              <div key={s.label} className="bg-surface border border-surface-hover rounded-2xl p-6 text-center card-hover">
                <p className="text-3xl font-bold text-primary tabular-nums">{s.value}</p>
                <p className="text-xs text-muted mt-2">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-subtle mt-6 flex items-center justify-center gap-1.5">
            <BarChart3 size={12} /> Live counters connect to platform analytics at launch.
          </p>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Testimonials</span>
            <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">Travellers, Hosts & Investors</h2>
          </div>
          <div className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
            {testimonials.map((t) => (
              <div key={t.id} className="snap-center shrink-0 w-[85%] sm:w-[420px] bg-surface border border-surface-hover rounded-2xl p-7">
                <Quote size={22} className="text-primary/40" />
                <p className="text-sm text-muted leading-relaxed mt-3">&ldquo;{t.comment}&rdquo;</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-surface-hover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-[11px] text-subtle">{t.location} · {t.stayName}</p>
                  </div>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={11} className="text-primary fill-primary" />
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-24 bg-surface/40">
        <div className="max-w-[800px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">FAQ</span>
            <h2 className="heading-display text-3xl lg:text-4xl text-foreground mt-3">Questions, Answered</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group bg-surface border border-border rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
                  {f.q}
                  <ChevronDown size={16} className="text-subtle shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-5 text-sm text-muted leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <div className="bg-surface/40">
        <ContactSection />
      </div>

      {/* ================= FINAL CTA ================= */}
      <section className="py-24">
        <div className="max-w-[900px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="heading-display text-3xl lg:text-5xl text-foreground">
            Let&apos;s Build the Future of Hospitality Together
          </h2>
          <p className="text-muted mt-4 max-w-xl mx-auto">
            Traveller, landowner, investor or partner — there&apos;s a place for you in this ecosystem.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {finalCtas.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className={`px-6 py-3 text-sm font-semibold rounded-full transition-colors ${
                  c.primary
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border text-foreground hover:border-primary/50"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
