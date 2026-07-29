"use client";

import Link from "next/link";
import { CheckCircle2, Calendar, MapPin, Users, Download, ArrowRight } from "lucide-react";

export default function ConfirmationPage() {
  return (
    <div className="bg-background min-h-screen pt-[72px] pb-24">
      <div className="max-w-[800px] mx-auto px-6 lg:px-8 py-16">
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="w-20 h-20 mx-auto bg-sage/10 rounded-full flex items-center justify-center mb-6 border border-sage/20">
            <CheckCircle2 size={40} className="text-sage" />
          </div>
          <h1 className="heading-display text-3xl md:text-5xl text-foreground mb-4">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-muted">
            Your curated escape awaits. We've sent a confirmation email to your inbox.
          </p>
          <div className="inline-block mt-4 px-4 py-2 bg-surface-hover border border-border rounded-full text-sm text-foreground">
            Booking ID: <span className="font-mono text-primary">DHY-847291</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Header Image Split */}
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3 h-48 md:h-auto bg-surface-hover relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1524230507669-5ff97982bb5e?q=80&w=800&auto=format&fit=crop"
                alt="The Glasshouse in the Pines"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-6 md:p-8 md:w-2/3">
              <span className="text-[10px] uppercase tracking-wider text-primary mb-2 block font-semibold">
                Heritage Stay
              </span>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                The Glasshouse in the Pines
              </h2>
              <p className="text-sm text-muted flex items-center gap-1 mb-6">
                <MapPin size={14} /> Mashobra, Himachal Pradesh
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Check-in</div>
                  <div className="text-sm font-medium text-foreground mb-1">Oct 15, 2026</div>
                  <div className="text-xs text-muted">2:00 PM</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Check-out</div>
                  <div className="text-sm font-medium text-foreground mb-1">Oct 18, 2026</div>
                  <div className="text-xs text-muted">11:00 AM</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border p-6 md:p-8 bg-background">
            <h3 className="text-sm font-semibold text-foreground mb-4">Payment Summary</h3>
            <div className="flex justify-between items-center mb-2 text-sm text-muted">
              <span>Amount Paid</span>
              <span>₹47,700</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted">
              <span>Payment Method</span>
              <span className="flex items-center gap-2">
                •••• 4242 <div className="w-8 h-5 bg-surface-hover rounded flex items-center justify-center text-[8px] font-bold text-foreground">VISA</div>
              </span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <button className="flex items-center justify-center gap-2 py-4 bg-surface border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
            <Download size={16} /> Download Invoice
          </button>
          <Link
            href="/traveller"
            className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
          >
            Go to My Dashboard <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </div>
  );
}
