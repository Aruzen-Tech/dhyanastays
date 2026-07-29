"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUser, saveAuthSession } from "@/lib/auth";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Check,
  AlertCircle,
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type Step1Errors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
};

type Step2Errors = {
  state?: string;
  city?: string;
  referral?: string;
  terms?: string;
};

type RegistrationData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [registrationData, setRegistrationData] =
    useState<RegistrationData>({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStep1Submit = (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const phone = String(data.get("phone") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const next: Step1Errors = {};

    if (!firstName) next.firstName = "Required.";
    if (!lastName) next.lastName = "Required.";

    if (!email) {
      next.email = "Email address is required.";
    } else if (!EMAIL_RE.test(email)) {
      next.email = "Enter a valid email address.";
    }

    if (!phone) next.phone = "Mobile number is required.";

    if (!password) {
      next.password = "Password is required.";
    } else if (!STRONG_PASSWORD_RE.test(password)) {
      next.password =
        "Min 8 characters, with uppercase, lowercase, number & special character.";
    }

    setStep1Errors(next);
    setFormError(null);

    if (Object.keys(next).length > 0) {
      return;
    }

    setRegistrationData({
      firstName,
      lastName,
      email,
      phone,
      password,
    });

    setStep(2);
  };

  const handleStep2Submit = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);
    const state = String(data.get("state") ?? "").trim();
    const city = String(data.get("city") ?? "").trim();
    const referralCode = String(data.get("referral") ?? "").trim();
    const terms = data.get("terms");

    const next: Step2Errors = {};

    if (!state) next.state = "Required.";
    if (!city) next.city = "Required.";

    if (
      referralCode &&
      (referralCode.length < 6 || referralCode.length > 12)
    ) {
      next.referral = "Referral code must contain 6 to 12 characters.";
    }

    if (!terms) {
      next.terms =
        "You must agree to the Terms & Conditions to continue.";
    }

    setStep2Errors(next);
    setFormError(null);

    if (Object.keys(next).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const tokens = await registerUser({
        email: registrationData.email,
        password: registrationData.password,
        fullName:
          `${registrationData.firstName} ${registrationData.lastName}`.trim(),
        role: "GUEST",
        ...(referralCode ? { referralCode } : {}),
      });

      saveAuthSession(tokens, false);
      router.push("/traveller");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center font-bold text-primary-foreground">
              D
            </div>
            <span className="text-2xl font-semibold text-foreground">
              Dhyana<span className="text-primary">Stays</span>
            </span>
          </Link>

          <h1 className="heading-display text-3xl text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-sm text-muted mb-8">
            Join the most curated travel community in India
          </p>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-10">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-hover text-subtle border border-border"
                  }`}
                >
                  {step > s ? <Check size={14} /> : s}
                </div>
                {s < 2 && (
                  <div
                    className={`w-16 h-0.5 rounded-full transition-all ${
                      step > s ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="text-xs text-subtle ml-2">
              Step {step} of 2
            </span>
          </div>

          {/* Social Login */}
          {step === 1 && (
            <>
              <div className="space-y-3 mb-8">
                <button className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-border text-sm text-foreground hover:bg-surface-hover hover:border-border-light transition-all">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                <button className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-border text-sm text-foreground hover:bg-surface-hover hover:border-border-light transition-all">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-subtle uppercase tracking-wider">
                  or register with email
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form className="space-y-4" noValidate onSubmit={handleStep1Submit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                      First Name
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
                      />
                      <input
                        type="text"
                        name="firstName"
                        defaultValue={registrationData.firstName}
                        placeholder="First name"
                        aria-invalid={!!step1Errors.firstName}
                        className={`w-full pl-11 pr-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                          step1Errors.firstName ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                        }`}
                      />
                    </div>
                    {step1Errors.firstName && (
                      <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                        <AlertCircle size={11} /> {step1Errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      defaultValue={registrationData.lastName}
                      placeholder="Last name"
                      aria-invalid={!!step1Errors.lastName}
                      className={`w-full px-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                        step1Errors.lastName ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                      }`}
                    />
                    {step1Errors.lastName && (
                      <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                        <AlertCircle size={11} /> {step1Errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
                    />
                    <input
                      type="email"
                      name="email"
                      defaultValue={registrationData.email}
                      placeholder="you@example.com"
                      aria-invalid={!!step1Errors.email}
                      className={`w-full pl-11 pr-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                        step1Errors.email ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                      }`}
                    />
                  </div>
                  {step1Errors.email && (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {step1Errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
                    />
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={registrationData.phone}
                      placeholder="+91 98765 43210"
                      aria-invalid={!!step1Errors.phone}
                      className={`w-full pl-11 pr-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                        step1Errors.phone ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                      }`}
                    />
                  </div>
                  {step1Errors.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {step1Errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      defaultValue={registrationData.password}
                      placeholder="Min 8 characters"
                      aria-invalid={!!step1Errors.password}
                      className={`w-full pl-11 pr-12 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                        step1Errors.password ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle hover:text-muted"
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  {/* Password strength */}
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i <= 2 ? "bg-primary" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  {step1Errors.password ? (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {step1Errors.password}
                    </p>
                  ) : (
                    <p className="text-[10px] text-subtle mt-1">
                      Must include uppercase, lowercase, number & special character
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 mt-2"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}

          {/* Step 2: Location & Preferences */}
          {step === 2 && (
            <form className="space-y-5 animate-fade-in" noValidate onSubmit={handleStep2Submit}>
              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                  Country
                </label>
                <select
                  name="country"
                  className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Canada</option>
                  <option>Australia</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    placeholder="Your state"
                    aria-invalid={!!step2Errors.state}
                    className={`w-full px-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                      step2Errors.state ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                    }`}
                  />
                  {step2Errors.state && (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {step2Errors.state}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Your city"
                    aria-invalid={!!step2Errors.city}
                    className={`w-full px-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                      step2Errors.city ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                    }`}
                  />
                  {step2Errors.city && (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {step2Errors.city}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  name="referral"
                  placeholder="Enter referral code"
                  aria-invalid={!!step2Errors.referral}
                  className={`w-full px-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                    step2Errors.referral
                      ? "border-terracotta focus:border-terracotta"
                      : "border-border focus:border-primary"
                  }`}
                />
                {step2Errors.referral && (
                  <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                    <AlertCircle size={11} />
                    {step2Errors.referral}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    name="terms"
                    className="mt-1 w-4 h-4 rounded bg-surface border-border accent-primary"
                  />
                  <label htmlFor="terms" className="text-xs text-muted">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                {step2Errors.terms && (
                  <p className="flex items-center gap-1.5 text-xs text-terracotta">
                    <AlertCircle size={11} /> {step2Errors.terms}
                  </p>
                )}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="marketing"
                    name="marketing"
                    className="mt-1 w-4 h-4 rounded bg-surface border-border accent-primary"
                  />
                  <label htmlFor="marketing" className="text-xs text-muted">
                    I&apos;d like to receive curated travel recommendations and offers
                  </label>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 border border-border text-muted font-medium text-sm rounded-xl hover:bg-surface-hover transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                  {!isSubmitting && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-subtle mt-8">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Decorative Panel */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-surface to-background border-l border-surface-hover overflow-hidden">
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-sage/5 blur-[100px]" />
        <div className="absolute bottom-1/3 -left-20 w-80 h-80 rounded-full bg-terracotta/5 blur-[100px]" />

        <div className="relative z-10 text-center p-16 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-sage/10 border border-sage/20 flex items-center justify-center mb-8">
            <span className="text-4xl">🌿</span>
          </div>
          <h2 className="heading-display text-3xl text-foreground mb-4">
            Join the Community
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            From discovering unique stays to investing in curated hospitality
            projects — your journey with Dhyana starts here.
          </p>
          {/* Features */}
          <div className="mt-10 space-y-4 text-left">
            {[
              "Access 312+ architect-curated stays",
              "AI-powered trip planning",
              "Earn rewards on every booking",
              "Invest in curated hospitality projects",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check size={10} className="text-primary" />
                </div>
                <span className="text-sm text-muted">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
