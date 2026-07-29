"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UploadCloud,
  MapPin,
  Home,
  Banknote,
  ClipboardCheck,
  LocateFixed,
  Video,
  Check,
  ShieldCheck,
  IndianRupee,
  Sparkles,
} from "lucide-react";

// ============================================
// LIST YOUR PROPERTY — full onboarding flow
// Basic info → Location → Media → Pricing → Review
// All fields wired to state; review reads it back.
// ============================================

const steps = [
  { num: 1, label: "Basic Info", icon: Home },
  { num: 2, label: "Location", icon: MapPin },
  { num: 3, label: "Media", icon: UploadCloud },
  { num: 4, label: "Pricing", icon: Banknote },
  { num: 5, label: "Review", icon: ClipboardCheck },
];

const propertyTypes = ["Tiny House", "Farm Stay", "Villa", "Cottage", "Eco Stay", "Heritage Home", "Wellness Retreat", "Hostel"];
const amenityOptions = ["Wi-Fi", "Swimming Pool", "AC", "Kitchen", "Parking", "Fireplace", "Pet Friendly", "Workspace", "Breakfast", "Campfire", "BBQ", "Jacuzzi"];
const featureOptions = ["Lake View", "Forest View", "Mountain View", "Private Pool", "Organic Farm", "Eco Friendly", "Wheelchair Accessible"];
const states = ["Tamil Nadu", "Kerala", "Karnataka", "Puducherry", "Goa"];

const photoPreviews = [
  "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=400&q=60",
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&q=60",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=60",
];

const inputCls =
  "w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary";
const labelCls = "block text-xs font-medium text-muted mb-2 uppercase tracking-wider";

export default function HostOnboardingFlow({
  returnHref = "/host",
  returnLabel = "Return to Dashboard",
}: {
  returnHref?: string;
  returnLabel?: string;
}) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // ---- Basic info ----
  const [name, setName] = useState("Mango Grove Eco Cottage");
  const [type, setType] = useState("Eco Stay");
  const [tagline, setTagline] = useState("A solar-powered cottage under a 40-year-old mango tree");
  const [story, setStory] = useState(
    "Built around the old mango tree my grandfather planted, the cottage runs fully on solar, harvests its own rainwater, and wakes up to peacocks."
  );
  const [guests, setGuests] = useState("4");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("2");
  const [area, setArea] = useState("850");
  const [amenities, setAmenities] = useState<string[]>(["Wi-Fi", "Kitchen", "Parking", "Campfire"]);
  const [features, setFeatures] = useState<string[]>(["Organic Farm", "Eco Friendly"]);

  const toggleIn = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // ---- Location ----
  const [address, setAddress] = useState("12, Mango Grove Lane, Kuilapalayam");
  const [landmark, setLandmark] = useState("2 km from Matrimandir");
  const [city, setCity] = useState("Auroville");
  const [district, setDistrict] = useState("Villupuram");
  const [stateName, setStateName] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("605101");
  const [pinned, setPinned] = useState(false);

  // ---- Media ----
  const [videoUrl, setVideoUrl] = useState("");
  const [tour360, setTour360] = useState(true);

  // ---- Pricing ----
  const [basePrice, setBasePrice] = useState("3800");
  const [weekendPct, setWeekendPct] = useState("20");
  const [cleaningFee, setCleaningFee] = useState("400");
  const [deposit, setDeposit] = useState("2000");
  const [longStayPct, setLongStayPct] = useState("15");

  const base = Number(basePrice) || 0;
  const commission = Math.round(base * 0.15);
  const hostEarns = base - commission;
  const weekendPrice = Math.round(base * (1 + (Number(weekendPct) || 0) / 100));

  const [agreed, setAgreed] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-[640px] mx-auto py-16 text-center animate-fade-in">
        <div className="w-20 h-20 mx-auto rounded-full bg-sage/15 flex items-center justify-center mb-6 border border-sage/30">
          <CheckCircle2 size={40} className="text-sage" />
        </div>
        <h1 className="heading-display text-3xl text-foreground mb-3">Listing request submitted</h1>
        <p className="text-muted max-w-md mx-auto leading-relaxed">
          <span className="text-foreground font-medium">{name}</span> is now in the pipeline.
          Our systematic checks (papers, photos, location, concept, pricing) run within 24 hours —
          then a manager calls you to approve the unit for listing.
        </p>
        <div className="flex items-center justify-center gap-2 mt-5 text-xs text-sage">
          <ShieldCheck size={14} /> Request ID: REQ-126 · you&apos;ll hear from us within 2 business days
        </div>
        <Link
          href={returnHref}
          className="inline-flex mt-8 px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
        >
          {returnLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[840px] mx-auto pb-12">
      {/* Header & progress */}
      <div className="mb-12">
        <h1 className="heading-display text-3xl text-foreground mb-2">List your property</h1>
        <p className="text-sm text-muted mb-8">
          Complete all five sections — clean files clear our systematic checks faster and a manager calls you to approve.
        </p>

        <div className="flex justify-between items-center relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-surface-hover -z-0" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-300"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => s.num < step && setStep(s.num)}
              className="relative z-10 flex flex-col items-center gap-2 bg-background px-2"
            >
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  step > s.num
                    ? "bg-sage text-white"
                    : step === s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-hover border border-border text-subtle"
                }`}
              >
                {step > s.num ? <Check size={18} /> : <s.icon size={17} />}
              </span>
              <span
                className={`text-[10px] font-medium uppercase tracking-wider hidden sm:block ${
                  step >= s.num ? "text-foreground" : "text-subtle"
                }`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 md:p-10">
        {/* ============ STEP 1 · BASIC INFO ============ */}
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Basic Information</h2>

            <div>
              <label className={labelCls}>Property Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Property Type</label>
              <div className="flex flex-wrap gap-2">
                {propertyTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                      type === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Tagline</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Max Guests", value: guests, set: setGuests },
                { label: "Bedrooms", value: bedrooms, set: setBedrooms },
                { label: "Bathrooms", value: bathrooms, set: setBathrooms },
                { label: "Area (sq ft)", value: area, set: setArea },
              ].map((f) => (
                <div key={f.label}>
                  <label className={labelCls}>{f.label}</label>
                  <input type="number" min="0" value={f.value} onChange={(e) => f.set(e.target.value)} className={inputCls} />
                </div>
              ))}
            </div>

            <div>
              <label className={labelCls}>The Story (your USP)</label>
              <textarea rows={3} value={story} onChange={(e) => setStory(e.target.value)} className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className={labelCls}>Amenities · {amenities.length} selected</label>
              <div className="flex flex-wrap gap-2">
                {amenityOptions.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleIn(amenities, setAmenities, a)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
                      amenities.includes(a)
                        ? "bg-sage/15 text-sage border-sage/50"
                        : "bg-background border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {amenities.includes(a) && <Check size={11} />}
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Property Features</label>
              <div className="flex flex-wrap gap-2">
                {featureOptions.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleIn(features, setFeatures, f)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
                      features.includes(f)
                        ? "bg-primary/15 text-primary border-primary/50"
                        : "bg-background border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {features.includes(f) && <Check size={11} />}
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 2 · LOCATION ============ */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Location</h2>

            <div>
              <label className={labelCls}>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Landmark</label>
                <input value={landmark} onChange={(e) => setLandmark(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Village / City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>District</label>
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Pincode</label>
                <input value={pincode} onChange={(e) => setPincode(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>State</label>
              <div className="flex flex-wrap gap-2">
                {states.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStateName(s)}
                    className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                      stateName === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Map pin */}
            <div>
              <label className={labelCls}>Pin on map</label>
              <div className="relative h-52 rounded-xl overflow-hidden border border-border bg-background">
                <svg viewBox="0 0 600 208" className="absolute inset-0 w-full h-full">
                  <rect width="600" height="208" fill="currentColor" className="text-surface" />
                  <ellipse cx="100" cy="50" rx="130" ry="70" fill="currentColor" className="text-sage/10" />
                  <ellipse cx="520" cy="180" rx="150" ry="80" fill="currentColor" className="text-sage/10" />
                  <path d="M0 140 C 150 120 300 160 600 100" stroke="currentColor" strokeWidth="10" fill="none" className="text-surface-hover" />
                  <path d="M80 208 C 140 140 260 80 420 30" stroke="currentColor" strokeWidth="7" fill="none" className="text-surface-hover" />
                  {pinned && (
                    <>
                      <circle cx="300" cy="104" r="18" fill="currentColor" className="text-primary/20">
                        <animate attributeName="r" values="12;22;12" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="300" cy="104" r="8" fill="currentColor" className="text-primary" />
                    </>
                  )}
                </svg>
                {!pinned ? (
                  <button
                    onClick={() => setPinned(true)}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex items-center gap-2 px-4 py-2.5 bg-background/90 backdrop-blur-sm border border-border rounded-full text-sm text-foreground hover:border-primary/50 transition-colors">
                      <LocateFixed size={15} className="text-primary" /> Detect &amp; pin my location
                    </span>
                  </button>
                ) : (
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border text-[11px] text-muted flex items-center gap-1.5">
                    <MapPin size={11} className="text-primary" /> 12.0032° N, 79.8121° E · pinned — drag to adjust
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 3 · MEDIA ============ */}
        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Media &amp; Documents</h2>
            <p className="text-sm text-muted -mt-4">High quality photos are crucial for approval — minimum 8.</p>

            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <UploadCloud size={36} className="text-primary mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1">Upload property photos</h3>
              <p className="text-xs text-subtle">Drag &amp; drop or browse · JPG/PNG · min 1920×1080 · max 10MB each</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {photoPreviews.map((src, i) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={src} alt={`Upload ${i + 1}`} className="aspect-square rounded-xl object-cover w-full" />
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      Cover
                    </span>
                  )}
                </div>
              ))}
              <div className="aspect-square rounded-xl border border-dashed border-border flex items-center justify-center text-subtle text-xs">
                + 5 more
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Video tour URL (optional)</label>
                <div className="relative">
                  <Video size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="youtube.com/…"
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>360° tour</label>
                <button
                  onClick={() => setTour360(!tour360)}
                  className={`w-full px-4 py-3 rounded-xl text-sm border transition-colors flex items-center justify-between ${
                    tour360 ? "border-sage/50 bg-sage/10 text-sage" : "border-border bg-background text-muted"
                  }`}
                >
                  {tour360 ? "Yes — we'll schedule a 360 shoot" : "Not now"}
                  {tour360 && <Check size={15} />}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">KYC &amp; ownership proof</h3>
              <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center text-muted">
                  <UploadCloud size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-foreground">Title deed / lease agreement</div>
                  <div className="text-xs text-subtle">PDF only · verified in the systematic checks</div>
                </div>
                <button className="px-4 py-2 border border-border text-xs font-medium text-foreground rounded-lg hover:bg-surface-hover">
                  Browse
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 4 · PRICING ============ */}
        {step === 4 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Pricing</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Base price / night</label>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
                  <input type="number" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Weekend premium (%)</label>
                <input type="number" min="0" value={weekendPct} onChange={(e) => setWeekendPct(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cleaning fee / stay</label>
                <input type="number" min="0" value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Security deposit (refundable)</label>
                <input type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Long-stay discount · 7+ nights (%)</label>
                <input type="number" min="0" value={longStayPct} onChange={(e) => setLongStayPct(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Live earnings preview */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-4">
                <Sparkles size={13} /> Your earnings preview
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-background border border-border p-4">
                  <p className="text-[10px] uppercase tracking-wider text-subtle">Guest pays</p>
                  <p className="text-lg font-bold text-foreground mt-1 tabular-nums">₹{base.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-subtle">weekday night</p>
                </div>
                <div className="rounded-xl bg-background border border-border p-4">
                  <p className="text-[10px] uppercase tracking-wider text-subtle">Dhyana fee 15%</p>
                  <p className="text-lg font-bold text-terracotta mt-1 tabular-nums">-₹{commission.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-subtle">commission</p>
                </div>
                <div className="rounded-xl bg-sage/10 border border-sage/40 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-sage">You earn</p>
                  <p className="text-lg font-bold text-sage mt-1 tabular-nums">₹{hostEarns.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-subtle">per night</p>
                </div>
              </div>
              <p className="text-[11px] text-muted mt-3">
                Weekends: guests pay <span className="text-foreground font-medium">₹{weekendPrice.toLocaleString("en-IN")}</span> ·
                similar {type.toLowerCase()}s in {city} average 78% occupancy.
              </p>
            </div>
          </div>
        )}

        {/* ============ STEP 5 · REVIEW ============ */}
        {step === 5 && (
          <div className="animate-fade-in space-y-5">
            <h2 className="text-xl font-semibold text-foreground">Review &amp; submit</h2>

            {[
              { title: "Basic info", edit: 1, rows: [`${name} · ${type}`, tagline, `${guests} guests · ${bedrooms} BR · ${bathrooms} bath · ${area} sq ft`, `${amenities.length} amenities · ${features.join(", ") || "no features"}`] },
              { title: "Location", edit: 2, rows: [address, `${landmark}`, `${city}, ${district}, ${stateName} — ${pincode}`, pinned ? "Map pin set · 12.0032° N, 79.8121° E" : "⚠ Map pin not set"] },
              { title: "Media", edit: 3, rows: [`3 photos uploaded (5 pending) · cover selected`, videoUrl ? `Video: ${videoUrl}` : "No video tour", tour360 ? "360° shoot requested" : "No 360 tour", "Title deed pending upload"] },
              { title: "Pricing", edit: 4, rows: [`₹${base.toLocaleString("en-IN")}/night · weekends ₹${weekendPrice.toLocaleString("en-IN")}`, `Cleaning ₹${cleaningFee} · deposit ₹${deposit}`, `${longStayPct}% off on 7+ nights`, `You earn ₹${hostEarns.toLocaleString("en-IN")}/night after 15% commission`] },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <button onClick={() => setStep(s.edit)} className="text-xs text-primary hover:underline">
                    Edit
                  </button>
                </div>
                <ul className="space-y-1">
                  {s.rows.map((r) => (
                    <li key={r} className="text-xs text-muted flex gap-2">
                      <Check size={12} className="text-sage shrink-0 mt-0.5" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <button
              onClick={() => setAgreed(!agreed)}
              className="w-full flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left"
            >
              <span
                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  agreed ? "bg-sage border-sage text-white" : "border-border"
                }`}
              >
                {agreed && <Check size={12} />}
              </span>
              <span className="text-xs text-muted leading-relaxed">
                I confirm I own or legally operate this property, the information is accurate, and I accept
                Dhyana&apos;s hosting terms, 15% commission and the curated inspection process.
              </span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-10 pt-6 border-t border-border">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
              step > 1 ? "text-foreground hover:bg-surface-hover" : "text-subtle cursor-not-allowed"
            }`}
          >
            <ArrowLeft size={16} /> Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors"
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => agreed && setSubmitted(true)}
              disabled={!agreed}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit for review <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
