"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Star } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const categoryOptions = [
  { value: "guest-stays", label: "A Stay", subject: "stay" },
  { value: "experiences", label: "An Experience", subject: "experience" },
  { value: "investors", label: "An Investment Program", subject: "investment program" },
] as const;

type ReviewErrors = {
  name?: string;
  email?: string;
  subject?: string;
  rating?: string;
  comment?: string;
};

export default function WriteReviewPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<(typeof categoryOptions)[number]["value"]>("guest-stays");
  const [subject, setSubject] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: ReviewErrors = {};
    if (!name.trim()) next.name = "Required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!subject.trim()) next.subject = "Tell us what you're reviewing.";
    if (rating === 0) next.rating = "Pick a star rating.";
    if (!comment.trim()) next.comment = "Share a few words about your experience.";

    setErrors(next);
    if (Object.keys(next).length === 0) setSubmitted(true);
  };

  const subjectLabel = categoryOptions.find((c) => c.value === category)?.subject ?? "stay";

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="max-w-[720px] mx-auto px-6 lg:px-8 pt-8">
        <Link href="/reviews" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
          <ArrowLeft size={12} /> Back to Reviews
        </Link>
      </div>

      <div className="py-10 md:py-14 text-center px-6">
        <h1 className="heading-display text-4xl lg:text-5xl text-foreground mb-4">Share your Dhyana story</h1>
        <p className="text-muted max-w-lg mx-auto text-sm md:text-base">
          Whether it was a stay, an experience or an investment — future travellers read every word.
        </p>
      </div>

      <div className="max-w-[720px] mx-auto px-6 lg:px-8">
        {!submitted ? (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-10 shadow-organic">
            <form className="space-y-6" noValidate onSubmit={handleSubmit}>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Your Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    aria-invalid={!!errors.name}
                    className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                      errors.name ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.name && (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                      errors.email ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.email && (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">What are you reviewing?</label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all ${
                        category === c.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted hover:text-foreground hover:border-border-light"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                  Name of the {subjectLabel}
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Stone Valley Farm Stay"
                  aria-invalid={!!errors.subject}
                  className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                    errors.subject ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                  }`}
                />
                {errors.subject && (
                  <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                    <AlertCircle size={11} /> {errors.subject}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Your Rating</label>
                <div className="flex gap-1.5" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      className="p-0.5"
                    >
                      <Star
                        size={26}
                        className={
                          n <= (hoverRating || rating)
                            ? "text-primary fill-primary transition-colors"
                            : "text-border transition-colors"
                        }
                      />
                    </button>
                  ))}
                </div>
                {errors.rating && (
                  <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                    <AlertCircle size={11} /> {errors.rating}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Your Review</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  placeholder="What stood out about your experience?"
                  aria-invalid={!!errors.comment}
                  className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors resize-none ${
                    errors.comment ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                  }`}
                />
                {errors.comment && (
                  <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                    <AlertCircle size={11} /> {errors.comment}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(228,138,74,0.3)] transition-all flex items-center justify-center gap-2"
              >
                Submit Review <ArrowRight size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-10 md:p-14 text-center shadow-organic animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mx-auto mb-6">
              <Check size={26} className="text-sage" />
            </div>
            <h3 className="heading-display text-2xl md:text-3xl text-foreground mb-3">Thank you, {name.split(" ")[0]}</h3>
            <p className="text-sm text-muted max-w-md mx-auto mb-8">
              Your review has been submitted for moderation and will appear on our Guest Stories page shortly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
              >
                Back to Reviews
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(228,138,74,0.35)] transition-all"
              >
                Explore DhyanaStays <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
