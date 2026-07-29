"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { testimonials } from "@/lib/mock-data";
import { TestimonialMeta } from "@/app/components/TestimonialsCarousel";

const filters = [
  { key: "all", label: "All" },
  { key: "guest-stays", label: "Guest Stays" },
  { key: "experiences", label: "Experiences" },
  { key: "investors", label: "Investors" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

export default function ReviewsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(
    () => (filter === "all" ? testimonials : testimonials.filter((t) => t.category === filter)),
    [filter]
  );

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 pt-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
          <ArrowLeft size={12} /> Back to Home
        </Link>
      </div>

      <div className="py-10 md:py-14 text-center px-6">
        <span className="text-xs font-semibold text-sage uppercase tracking-widest">Guest Stories</span>
        <h1 className="heading-display text-4xl lg:text-5xl text-foreground mt-2 mb-4">All Reviews</h1>
        <p className="text-muted max-w-xl mx-auto text-sm md:text-base">
          {testimonials.length}{" "}
          stories from guests, creators and investors who&apos;ve built something with DhyanaStays.
        </p>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_16px_rgba(228,138,74,0.25)]"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-border-light"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {filtered.map((t) => (
            <div key={t.id} className="relative p-6 sm:p-8 rounded-2xl bg-surface border border-surface-hover card-hover">
              <Quote size={28} className="text-sage/20 absolute top-6 right-6" />
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  loading="lazy"
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover border border-border"
                />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                  <p className="text-xs text-subtle">{t.location}</p>
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={13} className="text-primary fill-primary" />
                ))}
              </div>
              <p className="text-sm text-muted leading-relaxed mb-3">&ldquo;{t.comment}&rdquo;</p>
              <TestimonialMeta t={t} />
            </div>
          ))}
        </div>

        <div className="mt-14 text-center border-t border-border/60 pt-10">
          <h3 className="heading-organic text-xl sm:text-2xl text-foreground mb-2">Share your Dhyana story</h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-5">
            Tell future travellers what your stay, experience or investment with us was like.
          </p>
          <Link
            href="/reviews/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-full hover:shadow-[0_0_30px_rgba(228,138,74,0.35)] transition-all"
          >
            Write a review <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
