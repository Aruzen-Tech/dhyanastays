"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(value.length - 1);
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length === 6) {
      // In a real app, verify OTP here. For mock, just redirect to traveller dashboard.
      router.push("/traveller");
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
            Verify Your Account
          </h1>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            We've sent a 6-digit verification code to your email and mobile
            number. Please enter it below.
          </p>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={otp.join("").length !== 6}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify & Continue
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-subtle">
            <p>Didn't receive the code?</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <button className="text-primary hover:underline font-medium">
                Resend Email
              </button>
              <span className="w-1 h-1 rounded-full bg-border" />
              <button className="text-primary hover:underline font-medium">
                Resend SMS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Decorative Panel */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-surface to-background border-l border-surface-hover overflow-hidden">
        <div className="absolute top-1/2 -translate-y-1/2 -left-32 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="relative z-10 text-center p-16 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <h2 className="heading-display text-3xl text-foreground mb-4">
            Trusted Community
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Dhyana Stays is built on trust. By verifying accounts, we ensure a
            safe and authentic environment for both our guests and our curated
            hosts.
          </p>
        </div>
      </div>
    </div>
  );
}
