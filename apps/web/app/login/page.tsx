"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { loginUser, saveAuthSession } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const remember = data.get("remember") === "on";

    const next: typeof errors = {};

    if (!email) {
      next.email = "Email address is required.";
    } else if (!EMAIL_RE.test(email)) {
      next.email = "Enter a valid email address.";
    }

    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 8) {
      next.password = "Password must contain at least 8 characters.";
    }

    setErrors(next);

    if (Object.keys(next).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginUser({ email, password });

      if ("accessToken" in result) {
        saveAuthSession(result, remember);
        router.push("/traveller");
        return;
      }

      sessionStorage.setItem("dhyana_mfa_token", result.mfaToken);
      router.push("/verify-otp?mode=mfa");
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Unable to sign in. Please try again.",
      });
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
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center font-bold text-primary-foreground">
              D
            </div>
            <span className="text-2xl font-semibold text-foreground">
              Dhyana<span className="text-primary">Stays</span>
            </span>
          </Link>

          <h1 className="heading-display text-3xl text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-muted mb-10">
            Sign in to access your curated travel world
          </p>

          {/* Social Login */}
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

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-subtle uppercase tracking-wider">
              or sign in with email
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form className="space-y-5" noValidate onSubmit={handleSubmit}>
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
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  className={`w-full pl-11 pr-4 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                    errors.email ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1.5 text-xs text-terracotta mt-2">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                  className={`w-full pl-11 pr-12 py-3.5 bg-surface border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                    errors.password ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle hover:text-muted transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-xs text-terracotta mt-2">
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                name="remember"
                className="w-4 h-4 rounded bg-surface border-border accent-primary"
              />
              <label
                htmlFor="remember"
                className="text-xs text-muted"
              >
                Remember me for 30 days
              </label>
            </div>

            {errors.form && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-sm text-subtle mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Decorative Panel */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-surface to-background border-l border-surface-hover overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-sage/5 blur-[100px]" />

        <div className="relative z-10 text-center p-16 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
            <span className="text-4xl">🏡</span>
          </div>
          <h2 className="heading-display text-3xl text-foreground mb-4">
            Curated Stays Await
          </h2>
          <p className="text-sm text-muted leading-relaxed mb-8">
            Every stay on Dhyana has been architect-inspected and quality-scored
            across 7 dimensions. Your perfect escape is just a login away.
          </p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-gradient-gold">312+</div>
              <div className="text-[10px] text-subtle uppercase tracking-wider mt-1">
                Curated Stays
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gradient-gold">4.82</div>
              <div className="text-[10px] text-subtle uppercase tracking-wider mt-1">
                Avg Rating
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gradient-gold">45+</div>
              <div className="text-[10px] text-subtle uppercase tracking-wider mt-1">
                Destinations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
