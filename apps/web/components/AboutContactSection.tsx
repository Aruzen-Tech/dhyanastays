'use client';

/**
 * Contact block for the About Us page.
 *
 * The form is intentionally client-only, matching how the design reference
 * itself behaves: submitting shows a confirmation state but nothing is sent
 * anywhere (no email, no stored record). There is no backend endpoint for
 * this anywhere in the app, and none was added for this page — wiring this
 * up to a real mail relay is a separate, explicitly-approved change.
 *
 * Contact details below are placeholders — swap them for the real support
 * email/phone/office once available.
 */

import { useState } from 'react';

function IconMail({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function IconPhone({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}
function IconMapPin({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

const DEPARTMENTS = [
  { label: 'Host Support', email: 'hosts@dhyanastays.com' },
  { label: 'Investor Relations', email: 'invest@dhyanastays.com' },
  { label: 'General Inquiries', email: 'hello@dhyanastays.com' },
];

export default function AboutContactSection() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="contact" className="py-16 md:py-24 scroll-mt-20">
      <div className="container-page">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">Get in Touch</span>
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mt-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Talk to Our Team
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Booking a stay, listing a property, or asking about investing — our team
            replies within 24 hours.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Contact info */}
          <div>
            <div className="space-y-7">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-white card flex items-center justify-center shrink-0">
                  <IconMail className="text-brand-700" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Email Us</h3>
                  <p className="text-sm text-gray-500 mb-2">Our team is here to help.</p>
                  <a href="mailto:hello@dhyanastays.com" className="text-sm text-brand-700 hover:underline">
                    hello@dhyanastays.com
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-white card flex items-center justify-center shrink-0">
                  <IconPhone className="text-brand-700" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Call Us</h3>
                  <p className="text-sm text-gray-500 mb-2">Mon–Fri, 9am to 6pm IST.</p>
                  <a href="tel:+919876543210" className="text-sm text-brand-700 hover:underline">
                    +91 98765 43210
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-white card flex items-center justify-center shrink-0">
                  <IconMapPin className="text-brand-700" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Office</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Placeholder address —<br />
                    to be updated with the real office location.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Specific Inquiries</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {DEPARTMENTS.map((d) => (
                  <div key={d.email}>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{d.label}</div>
                    <a href={`mailto:${d.email}`} className="text-sm text-gray-500 hover:text-brand-700 break-all">
                      {d.email}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form — client-only, does not submit anywhere */}
          <div className="bg-white card rounded-2xl p-6 sm:p-8">
            {!submitted ? (
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
              >
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="about-first-name" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      id="about-first-name"
                      type="text"
                      required
                      placeholder="First name"
                      className="input"
                    />
                  </div>
                  <div>
                    <label htmlFor="about-last-name" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      id="about-last-name"
                      type="text"
                      required
                      placeholder="Last name"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="about-email" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="about-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="about-inquiry-type" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                    Inquiry Type
                  </label>
                  <select id="about-inquiry-type" className="input" defaultValue="General Inquiry">
                    <option>General Inquiry</option>
                    <option>Booking Support</option>
                    <option>Hosting with Dhyana</option>
                    <option>Investment Opportunities</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="about-message" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    id="about-message"
                    required
                    rows={4}
                    placeholder="How can we help you?"
                    className="input resize-none"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center">
                  Send Message <IconArrowRight />
                </button>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-6">
                  <IconMail className="text-brand-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Message Sent
                </h3>
                <p className="text-sm text-gray-500 mb-8 max-w-xs">
                  Thank you for reaching out. A member of our team will get back to you within 24 hours.
                </p>
                <button type="button" onClick={() => setSubmitted(false)} className="text-sm text-brand-700 hover:underline">
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
