"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

// ============================================
// Shared Contact section — embedded on About Us
// and Business pages instead of a standalone
// top-level Contact page.
// ============================================

export default function ContactSection() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <section id="contact" className="py-24 scroll-mt-20">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Get in Touch</span>
          <h2 className="heading-display text-3xl lg:text-5xl text-foreground mt-3">
            Talk to Our Team
          </h2>
          <p className="text-muted mt-4 max-w-xl mx-auto">
            Booking a stay, listing a property, investing, or discussing an architectural project —
            our team replies within 24 hours.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <div className="space-y-7">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
                  <Mail className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Email Us</h3>
                  <p className="text-sm text-muted mb-2">Our friendly team is here to help.</p>
                  <a href="mailto:hello@dhyanastays.com" className="text-sm text-primary hover:underline">
                    hello@dhyanastays.com
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
                  <Phone className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Call Us</h3>
                  <p className="text-sm text-muted mb-2">Mon-Fri from 9am to 6pm.</p>
                  <a href="tel:+919876543210" className="text-sm text-primary hover:underline">
                    +91 98765 43210
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
                  <MapPin className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">HQ Office</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    123 Design Avenue,<br />
                    Indiranagar, Bangalore,<br />
                    Karnataka, India 560038
                  </p>
                </div>
              </div>
            </div>

            {/* Department Emails */}
            <div className="mt-10 pt-8 border-t border-surface-hover">
              <h3 className="text-sm font-medium text-foreground mb-4">Specific Inquiries</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-subtle uppercase tracking-wider mb-1">Host Support</div>
                  <a href="mailto:hosts@dhyanastays.com" className="text-sm text-muted hover:text-primary">hosts@dhyanastays.com</a>
                </div>
                <div>
                  <div className="text-xs text-subtle uppercase tracking-wider mb-1">Press</div>
                  <a href="mailto:press@dhyanastays.com" className="text-sm text-muted hover:text-primary">press@dhyanastays.com</a>
                </div>
                <div>
                  <div className="text-xs text-subtle uppercase tracking-wider mb-1">Investors</div>
                  <a href="mailto:invest@dhyanastays.com" className="text-sm text-muted hover:text-primary">invest@dhyanastays.com</a>
                </div>
                <div>
                  <div className="text-xs text-subtle uppercase tracking-wider mb-1">Architecture</div>
                  <a href="mailto:design@dhyanastays.com" className="text-sm text-muted hover:text-primary">design@dhyanastays.com</a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-surface border border-border rounded-2xl p-8">
            {!isSubmitted ? (
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSubmitted(true);
                }}
              >
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Last name"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Inquiry Type
                  </label>
                  <select className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none">
                    <option>General Inquiry</option>
                    <option>Booking Support</option>
                    <option>Hosting with Dhyana</option>
                    <option>Investment Opportunities</option>
                    <option>Architectural Consultancy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="How can we help you?"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  Send Message <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-fade-in-up">
                <div className="w-16 h-16 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mb-6">
                  <Mail size={24} className="text-sage" />
                </div>
                <h3 className="heading-display text-2xl text-foreground mb-2">Message Sent</h3>
                <p className="text-sm text-muted mb-8">
                  Thank you for reaching out. A member of our team will get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-sm text-primary hover:underline"
                >
                  Send another message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
