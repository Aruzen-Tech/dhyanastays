"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, ArrowRight, AlertCircle } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactErrors = { firstName?: string; lastName?: string; email?: string; message?: string };

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<ContactErrors>({});

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const next: ContactErrors = {};
    if (!firstName) next.firstName = "Required.";
    if (!lastName) next.lastName = "Required.";
    if (!email) next.email = "Email address is required.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!message) next.message = "Please tell us how we can help.";

    setErrors(next);
    if (Object.keys(next).length === 0) setIsSubmitted(true);
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="py-20 text-center px-6 border-b border-surface-hover">
        <h1 className="heading-display text-4xl lg:text-6xl text-foreground mb-6">
          Get in Touch
        </h1>
        <p className="text-muted max-w-2xl mx-auto">
          Whether you&apos;re looking to book a stay, list your property, or discuss an architectural project, our team is here to help.
        </p>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 pt-16">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-8">
              Contact Information
            </h2>

            <div className="space-y-8">
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
            <div className="mt-12 pt-8 border-t border-surface-hover">
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
              <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First name"
                      aria-invalid={!!errors.firstName}
                      className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                        errors.firstName ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                      }`}
                    />
                    {errors.firstName && (
                      <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                        <AlertCircle size={11} /> {errors.firstName}
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
                      placeholder="Last name"
                      aria-invalid={!!errors.lastName}
                      className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors ${
                        errors.lastName ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                      }`}
                    />
                    {errors.lastName && (
                      <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                        <AlertCircle size={11} /> {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
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

                <div>
                  <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                    Inquiry Type
                  </label>
                  <select
                    name="inquiryType"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
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
                    name="message"
                    rows={4}
                    placeholder="How can we help you?"
                    aria-invalid={!!errors.message}
                    className={`w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none transition-colors resize-none ${
                      errors.message ? "border-terracotta focus:border-terracotta" : "border-border focus:border-primary"
                    }`}
                  ></textarea>
                  {errors.message && (
                    <p className="flex items-center gap-1.5 text-xs text-terracotta mt-1.5">
                      <AlertCircle size={11} /> {errors.message}
                    </p>
                  )}
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
    </div>
  );
}
