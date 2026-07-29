import Link from "next/link";
import {
  MapPin,
  Phone,
  Clock,
  // Instagram,
  // Youtube,
  // Linkedin,
} from "lucide-react";
import { LogoMark } from "./Logo";

const contactInfo = [
  { icon: MapPin, label: "ECR Road, Auroville, Tamil Nadu" },
  { icon: Clock, label: "Support available every day, 24×7" },
  { icon: Phone, label: "+91 98400 36900" },
];

const footerSections = [
  {
    title: "Discover",
    links: [
      { label: "Tiny Houses", href: "/stays?category=tiny-houses" },
      { label: "Farm Stays", href: "/stays?category=farm-stays" },
      { label: "Wellness Retreats", href: "/stays?category=wellness-retreats" },
      { label: "Luxury Villas", href: "/stays?category=luxury-villas" },
      { label: "Eco Stays", href: "/stays?category=eco-stays" },
      { label: "Heritage Homes", href: "/stays?category=heritage-homes" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Press", href: "/press" },
    ],
  },
  {
    title: "For Hosts",
    links: [
      { label: "List Your Property", href: "/become-a-host" },
      { label: "Host Dashboard", href: "/host" },
      { label: "Quality Standards", href: "/quality-standards" },
      { label: "Host Resources", href: "/host-resources" },
    ],
  },
  {
    title: "For Investors",
    links: [
      { label: "Investment Model", href: "/investor" },
      { label: "Current Projects", href: "/investor/projects" },
      { label: "ROI Calculator", href: "/investor/calculator" },
      { label: "Investor FAQ", href: "/faq?category=investment" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-background border-t border-surface-hover">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-6 sm:py-10 lg:py-16">
        {/* Newsletter + contact — organic rounded band */}
        <div className="rounded-2xl sm:rounded-[32px] bg-surface-hover p-4 sm:p-6 lg:p-12 mb-5 sm:mb-8 lg:mb-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-5 lg:gap-8">
            <div>
              <h3 className="heading-organic text-2xl lg:text-3xl text-foreground mb-2">
                Stay Inspired
              </h3>
              <p className="text-muted text-sm max-w-md">
                Curated travel stories, new destinations, and exclusive offers —
                delivered to your inbox.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 lg:w-80 px-5 py-3 bg-surface border border-border rounded-full text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary transition-colors"
              />
              <button className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded-full shadow-organic hover:bg-primary-hover transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>

          {/* Quick contact row */}
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-5 mt-4 pt-4 sm:mt-6 sm:pt-6 lg:mt-10 lg:pt-8 border-t border-border">
            {contactInfo.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0">
                  <c.icon size={16} />
                </span>
                <span className="text-sm text-muted">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 py-6 sm:py-10 lg:py-16">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-primary uppercase tracking-widest mb-5">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 lg:gap-6 pt-6 lg:pt-8 border-t border-surface-hover">
          <div className="flex items-center gap-3">
            <LogoMark size={32} />
            <span className="text-sm text-subtle">
              © 2026 Dhyana Stays. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-xs text-subtle hover:text-muted transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-subtle hover:text-muted transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/cookies"
              className="text-xs text-subtle hover:text-muted transition-colors"
            >
              Cookies
            </Link>
          </div>

          {/* <div className="flex items-center gap-3">
            {[Instagram, Youtube, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="p-2 rounded-lg text-subtle hover:text-primary hover:bg-surface-hover transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div> */}
        </div>
      </div>
    </footer>
  );
}
