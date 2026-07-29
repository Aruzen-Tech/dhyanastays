"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Users,
  CheckCircle2,
  ShieldCheck,
  Quote,
  X,
  PlayCircle,
  Check,
  Copy,
} from "lucide-react";
import { experiences } from "@/lib/mock-data";

const experienceTestimonials = [
  {
    name: "Sofia Marchetti",
    location: "Milan, Italy",
    avatar: "https://i.pravatar.cc/150?img=26",
    comment: "Genuinely one of the best mornings of the whole trip. The host explained everything without ever rushing us.",
  },
  {
    name: "Karan Mehta",
    location: "Delhi",
    avatar: "https://i.pravatar.cc/150?img=17",
    comment: "Small group, unhurried pace, and a host who clearly loves what they do. Worth every rupee.",
  },
];

export default function ExperienceDetailsPage() {
  const params = useParams();
  const idParam = params?.id as string;
  const exp = experiences.find((e) => e.id === idParam) ?? experiences[0];

  const [guests, setGuests] = useState(2);
  const [reserved, setReserved] = useState(false);
  const [bookingId] = useState(() => `DHY-EXP-${Math.floor(10000 + Math.random() * 89999)}`);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const upNext = useMemo(() => {
    const others = experiences.filter((e) => e.id !== exp.id);
    return [...others].sort((a, b) => (a.category === exp.category ? -1 : 0) - (b.category === exp.category ? -1 : 0));
  }, [exp]);

  const serviceFee = Math.round(exp.price * guests * 0.1);
  const total = exp.price * guests + serviceFee;

  const copyBookingId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(bookingId).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-background pb-24 pt-[88px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-surface hover:bg-surface-hover rounded-full text-xs font-medium text-foreground transition-colors border border-border"
        >
          <ArrowLeft size={14} /> Back to Experiences
        </Link>

        {/* ================= VIDEO + UP NEXT (YouTube-style) ================= */}
        <div className="grid lg:grid-cols-3 gap-6 mb-4">
          <div className="lg:col-span-2">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
              {exp.video ? (
                <video
                  key={exp.id}
                  src={exp.video}
                  poster={exp.image}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={exp.image} alt={exp.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="mt-4">
              <span className="px-3 py-1 bg-surface text-foreground text-[10px] uppercase tracking-wider rounded-full border border-border font-semibold mb-3 inline-block">
                {exp.category}
              </span>
              <h1 className="heading-display text-3xl md:text-4xl text-foreground mb-3">{exp.name}</h1>
              <div className="flex flex-wrap items-center gap-5 text-sm text-muted">
                <div className="flex items-center gap-1 font-medium text-foreground">
                  <Star size={15} className="text-primary fill-primary" /> {exp.rating}{" "}
                  <span className="text-subtle font-normal">({exp.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1"><MapPin size={15} className="text-primary" /> {exp.location}</div>
                <div className="flex items-center gap-1"><Clock size={15} /> {exp.duration}</div>
                {exp.groupSize && <div className="flex items-center gap-1"><Users size={15} /> {exp.groupSize}</div>}
              </div>
              <p className="text-[11px] text-subtle mt-3">Sample preview clip — full recipe/host videos are filming soon.</p>
            </div>
          </div>

          {/* Up Next */}
          <div className="lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">Up Next</p>
            <div className="space-y-3 lg:max-h-[420px] lg:overflow-y-auto pr-1">
              {upNext.map((e) => (
                <Link
                  key={e.id}
                  href={`/experiences/${e.id}`}
                  className="group flex gap-3 rounded-xl hover:bg-surface-hover p-1.5 transition-colors"
                >
                  <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.image} alt={e.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {e.video && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                        <PlayCircle size={22} className="text-white drop-shadow" />
                      </span>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-semibold bg-black/70 text-white rounded">{e.duration}</span>
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{e.name}</p>
                    <p className="text-[11px] text-subtle mt-1">{e.category} · {e.location}</p>
                    <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                      <Star size={9} className="text-primary fill-primary" /> {e.rating}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ================= DETAILS + BOOKING ================= */}
        <div className="grid lg:grid-cols-3 gap-12 mt-10">
          <div className="lg:col-span-2 space-y-10">
            {exp.host && (
              <div className="flex items-center gap-4 py-6 border-y border-border">
                <div className="w-14 h-14 rounded-full bg-surface-hover overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={exp.host.avatar} alt={exp.host.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-foreground font-medium">Hosted by {exp.host.name}</h3>
                  <p className="text-sm text-muted">{exp.host.role}</p>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">What you&apos;ll do</h2>
              <p className="text-muted leading-relaxed">{exp.description}</p>
            </div>

            {exp.included && (
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">What&apos;s included</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {exp.included.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-primary shrink-0" />
                      <span className="text-foreground text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {exp.gallery && exp.gallery.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Photos</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[exp.image, ...exp.gallery].map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(src)}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${exp.name} photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Guest Stories</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                {experienceTestimonials.map((t) => (
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
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 sticky top-24 shadow-2xl">
              {!reserved ? (
                <>
                  <div className="flex items-baseline gap-2 mb-6 text-foreground">
                    <span className="text-3xl font-bold">₹{exp.price}</span>
                    <span className="text-sm text-muted">/ person</span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="p-3 border-b border-border bg-background">
                        <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1">Date</label>
                        <input type="date" className="w-full bg-transparent text-foreground text-sm focus:outline-none cursor-pointer" defaultValue="2026-10-16" />
                      </div>
                      <div className="p-3 bg-background flex justify-between items-center">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1">Guests</label>
                          <div className="text-sm text-foreground">{guests} {guests === 1 ? "Guest" : "Guests"}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors">-</button>
                          <button onClick={() => setGuests(Math.min(6, guests + 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors">+</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm border-b border-border pb-6 mb-6">
                    <div className="flex justify-between text-muted">
                      <span>₹{exp.price} x {guests} guests</span>
                      <span>₹{exp.price * guests}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Service fee</span>
                      <span>₹{serviceFee}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-lg font-bold text-foreground mb-6">
                    <span>Total</span>
                    <span>₹{total}</span>
                  </div>

                  <button
                    onClick={() => setReserved(true)}
                    className="w-full py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all mb-4"
                  >
                    Reserve Experience
                  </button>
                  <p className="text-center text-xs text-subtle">You won&apos;t be charged yet</p>
                </>
              ) : (
                <div className="text-center py-4 animate-fade-in-up">
                  <div className="w-16 h-16 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mx-auto mb-5">
                    <Check size={26} className="text-sage" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">You&apos;re in!</h3>
                  <p className="text-sm text-muted mb-5">
                    {guests} {guests === 1 ? "spot" : "spots"} reserved for {exp.name}. A confirmation has been sent to your inbox.
                  </p>
                  <button
                    onClick={copyBookingId}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-full text-xs text-foreground hover:border-primary/40 transition-colors mb-6"
                  >
                    {copied ? <Check size={12} className="text-sage" /> : <Copy size={12} />}
                    <span className="font-mono">{bookingId}</span>
                  </button>
                  <div className="space-y-2">
                    <Link
                      href="/traveller/bookings"
                      className="block w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors text-sm"
                    >
                      View my bookings
                    </Link>
                    <button
                      onClick={() => setReserved(false)}
                      className="block w-full py-3 border border-border rounded-xl text-sm text-muted hover:text-foreground transition-colors"
                    >
                      Book another slot
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              <ShieldCheck size={16} className="text-sage" /> Dhyana Verified Experience
            </div>
          </div>
        </div>
      </div>

      {/* ================= PHOTO LIGHTBOX ================= */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt={exp.name} className="max-w-full max-h-[85vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
