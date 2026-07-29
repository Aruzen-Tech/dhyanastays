"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Cake,
  Camera,
  AtSign,
  Link2,
  Users,
  Eye,
  PlayCircle,
  FolderOpen,
  Tag,
  Globe,
  Plane,
  IndianRupee,
  Building2,
  Heart,
  Video,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Home,
  LayoutDashboard,
  Clock,
  Star,
  UploadCloud,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

const steps = [
  { key: 1, label: "Personal", title: "Personal Details", subtitle: "Tell us a little about you." },
  { key: 2, label: "Social Media", title: "Social Media", subtitle: "Your reach and where we can see your work." },
  { key: 3, label: "Creator Details", title: "Creator Details", subtitle: "What you create and how you'd like to collaborate." },
] as const;

const contentCategories = [
  "Travel",
  "Food & Culinary",
  "Lifestyle",
  "Wellness & Yoga",
  "Photography",
  "Fashion & Beauty",
  "Adventure & Outdoors",
  "Comedy & Entertainment",
  "Vlogging",
  "Other",
];

const followerRanges = [
  "Below 5,000",
  "5,000 – 25,000 (Nano)",
  "25,000 – 150,000 (Micro)",
  "150,000+ (Macro)",
];

const travelOptions = [
  "Anytime — fully flexible",
  "Weekends only",
  "Specific months only",
  "Rarely available",
];

const collabOptions = [
  { key: "free-stay", label: "Free Stay", icon: Home },
  { key: "paid", label: "Paid", icon: IndianRupee },
  { key: "affiliate", label: "Affiliate", icon: TrendingUp },
  { key: "brand-ambassador", label: "Brand Ambassador", icon: BadgeCheck },
];

const benefits = [
  { icon: Home, title: "Free Stays", desc: "Curated properties, on us." },
  { icon: IndianRupee, title: "Paid Collaborations", desc: "Campaign fees on top of stays." },
  { icon: LayoutDashboard, title: "Creator Dashboard", desc: "Track collabs, credits and payouts." },
  { icon: Users, title: "Exclusive Community", desc: "Network with fellow creators." },
  { icon: Clock, title: "Review Time: 48 Hours", desc: "Fast, human review — always." },
];

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  age: string;
  igUsername: string;
  igLink: string;
  followers: string;
  avgReelViews: string;
  youtubeLink: string;
  portfolioLink: string;
  bestContent: string;
  category: string;
  bio: string;
  languages: string;
  travelAvailability: string;
  collab: string[];
  chargeReel: string;
  chargeStory: string;
  chargePost: string;
  prevCollabs: string;
  whyJoin: string;
  introVideo: string;
  declaration: boolean;
}

const emptyValues: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  age: "",
  igUsername: "",
  igLink: "",
  followers: "",
  avgReelViews: "",
  youtubeLink: "",
  portfolioLink: "",
  bestContent: "",
  category: "",
  bio: "",
  languages: "",
  travelAvailability: "",
  collab: [],
  chargeReel: "",
  chargeStory: "",
  chargePost: "",
  prevCollabs: "",
  whyJoin: "",
  introVideo: "",
  declaration: false,
};

type Errors = Partial<Record<keyof FormValues, string>>;

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
      {children} {optional && <span className="normal-case text-subtle">(optional)</span>}
    </label>
  );
}

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
      <AlertCircle size={11} /> {error}
    </p>
  );
}

function fieldClass(error?: string) {
  return `w-full pl-10 pr-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
    error ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
  }`;
}

export default function ApplyInfluencerPage() {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step > 1) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setValues((v) => ({ ...v, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setValues((v) => ({ ...v, [name]: value }));
    }
    setErrors((prev) => {
      if (!prev[name as keyof FormValues]) return prev;
      const next = { ...prev };
      delete next[name as keyof FormValues];
      return next;
    });
  };

  const toggleCollab = (key: string) => {
    setValues((v) => ({
      ...v,
      collab: v.collab.includes(key) ? v.collab.filter((c) => c !== key) : [...v.collab, key],
    }));
    setErrors((prev) => {
      if (!prev.collab) return prev;
      const next = { ...prev };
      delete next.collab;
      return next;
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validateStep1 = (): Errors => {
    const e: Errors = {};
    if (!values.fullName.trim()) e.fullName = "Required.";
    if (!values.email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(values.email)) e.email = "Enter a valid email address.";
    if (!values.phone.trim()) e.phone = "Phone number is required.";
    else if (!PHONE_RE.test(values.phone)) e.phone = "Enter a valid phone number.";
    if (!values.city.trim()) e.city = "Required.";
    if (!values.age.trim()) e.age = "Required.";
    else if (Number(values.age) < 16 || Number(values.age) > 100) e.age = "Must be between 16 and 100.";
    return e;
  };

  const validateStep2 = (): Errors => {
    const e: Errors = {};
    if (!values.igUsername.trim()) e.igUsername = "Required.";
    if (!values.igLink.trim()) e.igLink = "Required.";
    if (!values.followers) e.followers = "Select your follower range.";
    if (!values.avgReelViews.trim()) e.avgReelViews = "Required.";
    if (!values.portfolioLink.trim()) e.portfolioLink = "Required.";
    if (!values.bestContent.trim()) e.bestContent = "Share at least one link.";
    return e;
  };

  const validateStep3 = (): Errors => {
    const e: Errors = {};
    if (!values.category) e.category = "Select a category.";
    if (!values.bio.trim()) e.bio = "Tell us about yourself.";
    if (!values.languages.trim()) e.languages = "Required.";
    if (!values.travelAvailability) e.travelAvailability = "Select your availability.";
    if (values.collab.length === 0) e.collab = "Pick at least one option.";
    if (!values.whyJoin.trim()) e.whyJoin = "Required.";
    if (!values.declaration) e.declaration = "Please confirm the declaration to continue.";
    return e;
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleFormSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const stepErrors = step === 1 ? validateStep1() : step === 2 ? validateStep2() : validateStep3();
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (step < 3) setStep((s) => s + 1);
    else setSubmitted(true);
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 pt-8">
        <Link
          href="/business"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={12} /> Back to Business Hub
        </Link>
      </div>

      <div className="py-10 md:py-14 text-center px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-5">
          <Star size={12} /> Influencer Program
        </div>
        <h1 className="heading-display text-4xl lg:text-5xl text-foreground mb-4">
          Apply as an Influencer
        </h1>
        <p className="text-muted max-w-xl mx-auto text-sm md:text-base">
          Free curated stays, paid collaborations and a creator dashboard — join the DhyanaStays
          creator community in three quick steps.
        </p>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10 items-start">
          {/* Form column */}
          <div className="lg:col-span-2" ref={cardRef}>
            {!submitted ? (
              <div className="bg-surface border border-border rounded-2xl p-6 md:p-10 shadow-organic">
                {/* Step indicator */}
                <div className="flex items-center mb-2">
                  {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                            step >= s.key
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface-hover text-subtle border border-border"
                          }`}
                        >
                          {step > s.key ? <Check size={16} /> : s.key}
                        </div>
                        <span
                          className={`text-[11px] font-medium whitespace-nowrap ${
                            step >= s.key ? "text-foreground" : "text-subtle"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 rounded-full mx-3 mb-6 transition-all ${
                            step > s.key ? "bg-primary" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-8 mb-8">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{steps[step - 1].title}</h2>
                    <p className="text-sm text-muted mt-1">{steps[step - 1].subtitle}</p>
                  </div>
                  <span className="text-xs text-subtle uppercase tracking-wider shrink-0 ml-4">
                    Step {step} of 3
                  </span>
                </div>

                <form className="space-y-6" noValidate onSubmit={handleFormSubmit}>
                  {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label>Full Name</Label>
                          <div className="relative">
                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              name="fullName"
                              value={values.fullName}
                              onChange={handleChange}
                              placeholder="Your full name"
                              className={fieldClass(errors.fullName)}
                            />
                          </div>
                          <ErrorText error={errors.fullName} />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              type="email"
                              name="email"
                              value={values.email}
                              onChange={handleChange}
                              placeholder="you@example.com"
                              className={fieldClass(errors.email)}
                            />
                          </div>
                          <ErrorText error={errors.email} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label>Phone</Label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              type="tel"
                              name="phone"
                              value={values.phone}
                              onChange={handleChange}
                              placeholder="+91 98765 43210"
                              className={fieldClass(errors.phone)}
                            />
                          </div>
                          <ErrorText error={errors.phone} />
                        </div>
                        <div>
                          <Label>City</Label>
                          <div className="relative">
                            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              name="city"
                              value={values.city}
                              onChange={handleChange}
                              placeholder="Where you're based"
                              className={fieldClass(errors.city)}
                            />
                          </div>
                          <ErrorText error={errors.city} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label>Age</Label>
                          <div className="relative">
                            <Cake size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              type="number"
                              min="16"
                              max="100"
                              name="age"
                              value={values.age}
                              onChange={handleChange}
                              placeholder="Your age"
                              className={fieldClass(errors.age)}
                            />
                          </div>
                          <ErrorText error={errors.age} />
                        </div>
                        <div>
                          <Label optional>Profile Photo</Label>
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-surface-hover border border-border flex items-center justify-center overflow-hidden shrink-0">
                              {photoPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                              ) : (
                                <Camera size={17} className="text-subtle" />
                              )}
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoChange}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-surface-hover hover:border-border-light transition-all"
                            >
                              <UploadCloud size={15} /> {photoPreview ? "Change" : "Upload"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label>Instagram Username</Label>
                          <div className="relative">
                            <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              name="igUsername"
                              value={values.igUsername}
                              onChange={handleChange}
                              placeholder="yourhandle"
                              className={fieldClass(errors.igUsername)}
                            />
                          </div>
                          <ErrorText error={errors.igUsername} />
                        </div>
                        <div>
                          <Label>Instagram Profile Link</Label>
                          <div className="relative">
                            <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              name="igLink"
                              value={values.igLink}
                              onChange={handleChange}
                              placeholder="instagram.com/yourhandle"
                              className={fieldClass(errors.igLink)}
                            />
                          </div>
                          <ErrorText error={errors.igLink} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label>Followers</Label>
                          <div className="relative">
                            <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle z-10" />
                            <select
                              name="followers"
                              value={values.followers}
                              onChange={handleChange}
                              className={`${fieldClass(errors.followers)} appearance-none`}
                            >
                              <option value="">Select a range</option>
                              {followerRanges.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                          <ErrorText error={errors.followers} />
                        </div>
                        <div>
                          <Label>Average Reel Views</Label>
                          <div className="relative">
                            <Eye size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              type="number"
                              min="0"
                              name="avgReelViews"
                              value={values.avgReelViews}
                              onChange={handleChange}
                              placeholder="e.g. 25000"
                              className={fieldClass(errors.avgReelViews)}
                            />
                          </div>
                          <ErrorText error={errors.avgReelViews} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label optional>YouTube Link</Label>
                          <div className="relative">
                            <PlayCircle size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              name="youtubeLink"
                              value={values.youtubeLink}
                              onChange={handleChange}
                              placeholder="youtube.com/@yourchannel"
                              className={fieldClass()}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Portfolio / Drive Link</Label>
                          <div className="relative">
                            <FolderOpen size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              name="portfolioLink"
                              value={values.portfolioLink}
                              onChange={handleChange}
                              placeholder="Link to your portfolio or drive folder"
                              className={fieldClass(errors.portfolioLink)}
                            />
                          </div>
                          <ErrorText error={errors.portfolioLink} />
                        </div>
                      </div>

                      <div>
                        <Label>Best Content Links</Label>
                        <textarea
                          name="bestContent"
                          value={values.bestContent}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Paste 2–3 links to your best reels or posts, one per line"
                          className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors resize-none ${
                            errors.bestContent ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                          }`}
                        />
                        <ErrorText error={errors.bestContent} />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label>Content Category</Label>
                          <div className="relative">
                            <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle z-10" />
                            <select
                              name="category"
                              value={values.category}
                              onChange={handleChange}
                              className={`${fieldClass(errors.category)} appearance-none`}
                            >
                              <option value="">Select a category</option>
                              {contentCategories.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <ErrorText error={errors.category} />
                        </div>
                        <div>
                          <Label>Languages</Label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              name="languages"
                              value={values.languages}
                              onChange={handleChange}
                              placeholder="e.g. English, Hindi, Tamil"
                              className={fieldClass(errors.languages)}
                            />
                          </div>
                          <ErrorText error={errors.languages} />
                        </div>
                      </div>

                      <div>
                        <Label>Short Bio</Label>
                        <textarea
                          name="bio"
                          value={values.bio}
                          onChange={handleChange}
                          rows={3}
                          placeholder="A couple of lines about you and your content"
                          className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors resize-none ${
                            errors.bio ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                          }`}
                        />
                        <ErrorText error={errors.bio} />
                      </div>

                      <div>
                        <Label>Travel Availability</Label>
                        <div className="relative">
                          <Plane size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle z-10" />
                          <select
                            name="travelAvailability"
                            value={values.travelAvailability}
                            onChange={handleChange}
                            className={`${fieldClass(errors.travelAvailability)} appearance-none`}
                          >
                            <option value="">Select your availability</option>
                            {travelOptions.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <ErrorText error={errors.travelAvailability} />
                      </div>

                      <div>
                        <Label>Collaboration Preference</Label>
                        <div className="flex flex-wrap gap-2.5">
                          {collabOptions.map((opt) => {
                            const active = values.collab.includes(opt.key);
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => toggleCollab(opt.key)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-foreground border-border hover:border-border-light hover:bg-surface-hover"
                                }`}
                              >
                                <Icon size={14} /> {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <ErrorText error={errors.collab} />
                      </div>

                      <div>
                        <Label optional>Expected Charges</Label>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="relative">
                            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              type="number"
                              min="0"
                              name="chargeReel"
                              value={values.chargeReel}
                              onChange={handleChange}
                              placeholder="Per Reel"
                              className="w-full pl-8 pr-3 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                          <div className="relative">
                            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              type="number"
                              min="0"
                              name="chargeStory"
                              value={values.chargeStory}
                              onChange={handleChange}
                              placeholder="Per Story"
                              className="w-full pl-8 pr-3 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                          <div className="relative">
                            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                            <input
                              type="number"
                              min="0"
                              name="chargePost"
                              value={values.chargePost}
                              onChange={handleChange}
                              placeholder="Per Post"
                              className="w-full pl-8 pr-3 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-subtle mt-1.5">
                          Leave blank if you&apos;re open to free-stay collaborations only.
                        </p>
                      </div>

                      <div>
                        <Label optional>Previous Brand Collaborations</Label>
                        <div className="relative">
                          <Building2 size={16} className="absolute left-3.5 top-4 text-subtle" />
                          <textarea
                            name="prevCollabs"
                            value={values.prevCollabs}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Brands you've worked with, if any"
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors resize-none"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Why do you want to join DhyanaStays?</Label>
                        <div className="relative">
                          <Heart size={16} className="absolute left-3.5 top-4 text-subtle" />
                          <textarea
                            name="whyJoin"
                            value={values.whyJoin}
                            onChange={handleChange}
                            rows={3}
                            placeholder="What draws you to our stays and community?"
                            className={`w-full pl-10 pr-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors resize-none ${
                              errors.whyJoin ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                            }`}
                          />
                        </div>
                        <ErrorText error={errors.whyJoin} />
                      </div>

                      <div>
                        <Label optional>Intro Video Link</Label>
                        <div className="relative">
                          <Video size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
                          <input
                            name="introVideo"
                            value={values.introVideo}
                            onChange={handleChange}
                            placeholder="YouTube or Drive link to a short intro"
                            className={fieldClass()}
                          />
                        </div>
                      </div>

                      <label
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                          errors.declaration ? "border-terracotta" : "border-border hover:border-border-light"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="declaration"
                          checked={values.declaration}
                          onChange={handleChange}
                          className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                        />
                        <span className="text-sm text-muted leading-relaxed">
                          I confirm that all the information provided is accurate, and I agree to
                          DhyanaStays&apos; Influencer Program{" "}
                          <Link href="/terms" className="text-primary hover:underline">
                            terms &amp; conditions
                          </Link>
                          .
                        </span>
                      </label>
                      <ErrorText error={errors.declaration} />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-surface-hover">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
                      >
                        <ArrowLeft size={15} /> Back
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(228,138,74,0.35)] transition-all"
                    >
                      {step < 3 ? "Continue" : "Submit Application"}
                      {step < 3 ? <ArrowRight size={16} /> : <Check size={16} />}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl p-10 md:p-14 text-center shadow-organic animate-fade-in-up">
                <div className="w-16 h-16 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mx-auto mb-6">
                  <Check size={26} className="text-sage" />
                </div>
                <h3 className="heading-display text-2xl md:text-3xl text-foreground mb-3">
                  Application Submitted
                </h3>
                <p className="text-sm text-muted max-w-md mx-auto mb-2">
                  Thanks{values.fullName ? `, ${values.fullName.split(" ")[0]}` : ""} — our partnerships
                  team reviews every application personally.
                </p>
                <p className="text-sm text-muted max-w-md mx-auto mb-8">
                  Expect to hear back within <span className="text-foreground font-medium">48 hours</span>
                  {values.email ? ` at ${values.email}` : ""}.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/business"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
                  >
                    Back to Business Hub
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

          {/* Sticky benefits column — desktop only */}
          <div className="hidden lg:block lg:sticky lg:top-24">
            <div className="bg-surface border border-border rounded-2xl p-8 shadow-organic">
              <h3 className="text-lg font-semibold text-foreground mb-1">Why creators choose us</h3>
              <p className="text-sm text-muted mb-6">Everything you get as a DhyanaStays creator partner.</p>
              <div className="space-y-5">
                {benefits.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.title} className="flex gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon size={17} className="text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{b.title}</div>
                        <div className="text-xs text-muted mt-0.5">{b.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-7 pt-6 border-t border-surface-hover flex items-center gap-2 text-xs text-subtle">
                <ShieldCheck size={14} className="text-sage" /> Verified partner program, no fees to apply.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
