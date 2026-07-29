"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  MapPin,
  Quote,
  X,
  FileDown,
  Check,
  ChevronRight,
  Users,
  CalendarDays,
  CreditCard,
  Wallet,
  Lock,
  PartyPopper,
} from "lucide-react";
import { eventPlanners } from "@/lib/mock-data";

function downloadBrochure(title: string, note: string, plannerName: string) {
  const content = `${title}\n${"=".repeat(title.length)}\n\n${note}\n\nPrepared by ${plannerName} for Dhyana Stays.\nThis is a sample brochure — full design PDFs are issued after booking.\n`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function EventPlannerDetailsPage() {
  const params = useParams();
  const idParam = params?.id as string;
  const planner = eventPlanners.find((p) => p.id === idParam) ?? eventPlanners[0];

  const [lightbox, setLightbox] = useState<string | null>(null);

  // Booking wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [eventDate, setEventDate] = useState("2026-12-12");
  const [guests, setGuests] = useState(50);
  const [venuePref, setVenuePref] = useState("Not sure yet — recommend one");
  const [packageIdx, setPackageIdx] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"card" | "upi">("card");
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId] = useState(() => `DHY-EVT-${Math.floor(10000 + Math.random() * 89999)}`);

  const pkgs = planner.packages ?? [];
  const selectedPkg = pkgs[packageIdx];
  const serviceFee = selectedPkg ? Math.round(selectedPkg.price * 0.05) : 0;
  const total = selectedPkg ? selectedPkg.price + serviceFee : 0;

  const canContinue =
    step === 1 ? Boolean(eventDate) && guests > 0
    : step === 2 ? pkgs.length > 0
    : step === 3 ? Boolean(name.trim() && email.trim() && phone.trim())
    : true;

  const pay = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setConfirmed(true);
    }, 1800);
  };

  return (
    <div className="bg-background pb-24 pt-[88px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <Link
          href="/event-planners"
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-surface hover:bg-surface-hover rounded-full text-xs font-medium text-foreground transition-colors border border-border"
        >
          <ArrowLeft size={14} /> Back to Event Planners
        </Link>

        {/* ================= HEADER ================= */}
        <div className="relative h-72 rounded-2xl overflow-hidden mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={planner.image} alt={planner.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-[10px] uppercase tracking-wider rounded-full border border-white/20 font-semibold mb-3 inline-block">
                {planner.type}
              </span>
              <h1 className="heading-display text-3xl md:text-4xl text-white flex items-center gap-2">
                {planner.name} <ShieldCheck size={22} className="text-sage" />
              </h1>
              <div className="flex items-center gap-4 text-sm text-white/80 mt-2">
                <span className="flex items-center gap-1"><Star size={14} className="text-primary fill-primary" /> {planner.rating}</span>
                <span>{planner.eventsDone}+ events curated</span>
              </div>
            </div>
            <a
              href="#book"
              className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary-hover transition-colors text-sm"
            >
              Book this planner
            </a>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            {/* About */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">About {planner.name}</h2>
              <p className="text-muted leading-relaxed">{planner.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {planner.tags.map((t) => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted">{t}</span>
                ))}
              </div>
            </div>

            {/* Portfolio */}
            {planner.gallery && planner.gallery.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Previous Designs</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[planner.image, ...planner.gallery].map((src, i) => (
                    <button key={i} onClick={() => setLightbox(src)} className="relative aspect-square rounded-xl overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${planner.name} portfolio ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Brochures */}
            {planner.brochures && planner.brochures.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Design Brochures</h2>
                <div className="space-y-3">
                  {planner.brochures.map((b) => (
                    <div key={b.title} className="flex items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileDown size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{b.title}</p>
                          <p className="text-xs text-subtle">{b.note}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadBrochure(b.title, b.note, planner.name)}
                        className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors whitespace-nowrap shrink-0"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonials */}
            {planner.testimonials && planner.testimonials.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Guest Stories</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {planner.testimonials.map((t) => (
                    <div key={t.name} className="p-5 rounded-2xl bg-surface border border-border relative">
                      <Quote size={20} className="text-primary/20 absolute top-4 right-4" />
                      <div className="flex items-center gap-3 mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-border" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.name}</p>
                          <p className="text-xs text-subtle">{t.location}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted leading-relaxed">&ldquo;{t.comment}&rdquo;</p>
                      <p className="text-xs text-primary mt-3 font-medium">{t.eventType}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================= BOOKING MODULE ================= */}
          <div id="book" className="lg:col-span-1 scroll-mt-24">
            <div className="bg-surface border border-border rounded-3xl p-6 md:p-7 sticky top-24 shadow-2xl">
              {confirmed ? (
                <div className="text-center py-4 animate-fade-in-up">
                  <div className="w-16 h-16 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mx-auto mb-5">
                    <Check size={26} className="text-sage" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Booking confirmed!</h3>
                  <p className="text-sm text-muted mb-5">
                    {planner.name} will reach out within 24 hours to lock in the details for your {selectedPkg?.name.toLowerCase()}.
                  </p>
                  <div className="inline-block px-4 py-2 bg-background border border-border rounded-full text-xs font-mono text-foreground mb-6">
                    {bookingId}
                  </div>
                  <div className="space-y-2">
                    <Link href="/traveller/bookings" className="block w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors text-sm">
                      View my bookings
                    </Link>
                    <Link href="/event-planners" className="block w-full py-3 border border-border rounded-xl text-sm text-muted hover:text-foreground transition-colors">
                      Browse other planners
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Step indicator */}
                  <div className="flex items-center gap-1.5 mb-6">
                    {[1, 2, 3, 4].map((s) => (
                      <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-surface-hover"}`} />
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">
                    Step {step} of 4
                  </p>

                  {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><PartyPopper size={17} className="text-primary" /> Event details</h3>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1.5">Event date</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-xl bg-background">
                          <CalendarDays size={15} className="text-subtle shrink-0" />
                          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full bg-transparent text-foreground text-sm focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1.5">Guest count</label>
                        <div className="flex items-center justify-between px-3 py-2.5 border border-border rounded-xl bg-background">
                          <span className="flex items-center gap-2 text-sm text-foreground"><Users size={15} className="text-subtle" /> {guests} guests</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setGuests((g) => Math.max(2, g - 10))} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors">-</button>
                            <button onClick={() => setGuests((g) => Math.min(500, g + 10))} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors">+</button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1.5">Venue preference</label>
                        <select value={venuePref} onChange={(e) => setVenuePref(e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:border-primary">
                          {["Not sure yet — recommend one", "Farm stay property", "Heritage home property", "Beach property"].map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-3 animate-fade-in">
                      <h3 className="text-lg font-semibold text-foreground mb-1">Choose a package</h3>
                      {pkgs.map((pkg, i) => (
                        <button
                          key={pkg.name}
                          onClick={() => setPackageIdx(i)}
                          className={`w-full text-left p-4 rounded-xl border transition-colors ${
                            packageIdx === i ? "border-primary bg-primary/5" : "border-border bg-background hover:border-border-light"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{pkg.name}</p>
                            <p className="text-sm font-bold text-primary whitespace-nowrap">₹{pkg.price.toLocaleString("en-IN")}</p>
                          </div>
                          <p className="text-xs text-subtle mt-0.5">{pkg.guests}</p>
                          <ul className="mt-2 space-y-1">
                            {pkg.includes.map((inc) => (
                              <li key={inc} className="text-[11px] text-muted flex items-center gap-1.5">
                                <Check size={10} className="text-sage shrink-0" /> {inc}
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="text-lg font-semibold text-foreground mb-1">Your contact details</h3>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1.5">Full name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1.5">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1.5">Phone</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary" />
                      </div>
                    </div>
                  )}

                  {step === 4 && selectedPkg && (
                    <form onSubmit={pay} className="space-y-4 animate-fade-in">
                      <h3 className="text-lg font-semibold text-foreground mb-1">Payment</h3>
                      <div className="rounded-xl bg-background border border-border p-4 space-y-2 text-sm">
                        <div className="flex justify-between text-muted"><span>{selectedPkg.name}</span><span>₹{selectedPkg.price.toLocaleString("en-IN")}</span></div>
                        <div className="flex justify-between text-muted"><span>Service fee</span><span>₹{serviceFee.toLocaleString("en-IN")}</span></div>
                        <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setMethod("card")} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors ${method === "card" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted"}`}>
                          <CreditCard size={18} className={method === "card" ? "text-primary" : ""} /> Card
                        </button>
                        <button type="button" onClick={() => setMethod("upi")} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors ${method === "upi" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted"}`}>
                          <Wallet size={18} className={method === "upi" ? "text-primary" : ""} /> UPI
                        </button>
                      </div>

                      {method === "card" ? (
                        <div className="space-y-2.5">
                          <input required placeholder="Card number" className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary" />
                          <div className="grid grid-cols-2 gap-2.5">
                            <input required placeholder="MM/YY" className="px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary" />
                            <div className="relative">
                              <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                              <input required placeholder="CVV" className="w-full pl-8 pr-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <input required placeholder="username@bank" className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary" />
                      )}

                      <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70"
                      >
                        {processing ? "Processing…" : `Pay ₹${total.toLocaleString("en-IN")}`}
                      </button>
                      <p className="text-center text-[11px] text-subtle flex items-center justify-center gap-1"><ShieldCheck size={11} className="text-sage" /> Secure & encrypted</p>
                    </form>
                  )}

                  {step < 4 && (
                    <div className="flex items-center gap-2 mt-6">
                      {step > 1 && (
                        <button onClick={() => setStep((s) => (s - 1) as typeof step)} className="px-4 py-2.5 text-sm font-medium border border-border rounded-xl text-muted hover:text-foreground transition-colors">
                          Back
                        </button>
                      )}
                      <button
                        onClick={() => canContinue && setStep((s) => (s + 1) as typeof step)}
                        disabled={!canContinue}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        Continue <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                  {step === 4 && (
                    <button onClick={() => setStep(3)} className="w-full mt-3 px-4 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors">
                      Back to contact details
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              <MapPin size={14} className="text-sage" /> Available across all Dhyana regions
            </div>
          </div>
        </div>
      </div>

      {/* ================= LIGHTBOX ================= */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} aria-label="Close" className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt={planner.name} className="max-w-full max-h-[85vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
