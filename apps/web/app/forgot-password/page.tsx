"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

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

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Back to login
          </Link>

          {!isSubmitted ? (
            <>
              <h1 className="heading-display text-3xl text-foreground mb-2">
                Reset Password
              </h1>
              <p className="text-sm text-muted mb-8">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>

              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSubmitted(true);
                }}
              >
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
                      required
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  Send Reset Link
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center animate-fade-in-up">
              <div className="w-16 h-16 mx-auto rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mb-6">
                <Mail size={24} className="text-sage" />
              </div>
              <h1 className="heading-display text-3xl text-foreground mb-4">
                Check Your Email
              </h1>
              <p className="text-sm text-muted mb-8 leading-relaxed">
                We've sent a password reset link to your email address. Please
                check your inbox and spam folder.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-sm text-primary hover:underline"
              >
                Didn't receive the email? Click to try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Decorative Panel */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-surface to-background border-l border-surface-hover overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-primary/5 blur-[100px]" />

        <div className="relative z-10 text-center p-16 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
            <span className="text-4xl">🔐</span>
          </div>
          <h2 className="heading-display text-3xl text-foreground mb-4">
            Secure Access
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Your security is our priority. Reset your password securely to
            continue accessing India's finest curated stays and experiences.
          </p>
        </div>
      </div>
    </div>
  );
}
