"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  Search,
  User,
  ChevronDown,
  Heart,
} from "lucide-react";
import { navLinks } from "@/lib/mock-data";
import { dashboardRoles, dashboardGroups } from "@/lib/dashboards";
import { ThemeToggle } from "./ThemeToggle";
import { LogoMark } from "./Logo";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"dashboard" | null>(null);
  const pathname = usePathname();
  const dashOpen = openMenu === "dashboard";
  const desktopNavRef = useRef<HTMLElement>(null);

  // Close whichever dropdown is open on outside click or Escape —
  // previously only closed via the trigger itself, so it stayed open
  // when hovering/clicking elsewhere in the navbar.
  useEffect(() => {
    if (!openMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[80] bg-white border-b border-border shadow-sm lg:bg-surface/70 lg:backdrop-blur-[20px] lg:border lg:shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:lg:shadow-[0_10px_30px_rgba(0,0,0,0.3)] lg:rounded-b-[28px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[58px] lg:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-3">
              <LogoMark size={40} />
            </span>
            <span className="font-serif text-[1.4rem] font-semibold tracking-tight text-foreground">
              Dhyana<span className="text-primary">Stays</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" ref={desktopNavRef}>
            {navLinks.map((link) => {
              const active = pathname === link.href;
              const isExperiences = link.label === "Experiences";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setOpenMenu(null)}
                  className={`group relative flex items-center gap-1 px-4 py-2.5 text-sm font-medium rounded-full transition-colors duration-200 hover:bg-surface-hover ${
                    active ? "text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {isExperiences ? "Curated Experiences" : link.label}
                  <span
                    className={`pointer-events-none absolute left-4 right-4 -bottom-0.5 h-[2px] rounded-full bg-primary origin-left transition-transform duration-300 ease-out ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}

            {/* Dashboard role dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu((m) => (m === "dashboard" ? null : "dashboard"))}
                aria-expanded={dashOpen}
                className={`flex items-center gap-1 px-4 py-2.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  dashOpen
                    ? "text-foreground bg-surface-hover"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                Dashboard
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${dashOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dashOpen && (
                <div className="absolute right-0 top-full mt-3 w-[600px] max-h-[72vh] overflow-y-auto rounded-[28px] border border-border bg-surface shadow-organic p-5 animate-fade-in">
                  <p className="text-[10px] uppercase tracking-wider text-subtle mb-3">
                    Choose your dashboard — switch anytime if you hold multiple
                    roles
                  </p>
                  <div className="grid grid-cols-2 gap-x-6">
                    {[0, 1].map((col) => (
                      <div key={col}>
                        {dashboardGroups
                          .filter((_, i) => i % 2 === col)
                          .map((group) => (
                            <div key={group} className="mb-4">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                                {group}
                              </p>
                              {dashboardRoles
                                .filter((r) => r.group === group && !r.hidden)
                                .map((r) => (
                                  <Link
                                    key={r.slug}
                                    href={`/${r.slug}`}
                                    onClick={() => setOpenMenu(null)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                                  >
                                    <r.icon size={15} className="text-subtle shrink-0" />
                                    {r.title.replace(" Dashboard", "")}
                                  </Link>
                                ))}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-1">
            <div className="flex items-center gap-1 pr-3 mr-2 border-r border-border/70">
              <Link
                href="/stays"
                aria-label="Search stays"
                className="w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface-hover active:scale-90 transition-all duration-200"
              >
                <Search size={18} />
              </Link>
              <Link
                href="/traveller/wishlist"
                aria-label="View wishlist"
                className="w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface-hover active:scale-90 transition-all duration-200"
              >
                <Heart size={18} />
              </Link>
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="group flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-full shadow-organic hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <User size={16} className="transition-transform duration-200 group-hover:scale-110" />
              Sign In
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden relative w-10 h-10 flex items-center justify-center rounded-full text-foreground hover:bg-surface-hover active:scale-90 transition-all duration-200"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <Menu
              size={22}
              className={`absolute transition-all duration-300 ease-out ${
                mobileOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
              }`}
            />
            <X
              size={22}
              className={`absolute transition-all duration-300 ease-out ${
                mobileOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer panel */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-[86%] max-w-sm bg-background shadow-2xl lg:hidden transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between h-[72px] px-6 border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={() => setMobileOpen(false)}
          >
            <LogoMark size={34} />
            <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
              Dhyana<span className="text-primary">Stays</span>
            </span>
          </Link>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full text-foreground hover:bg-surface-hover active:scale-90 transition-all duration-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-72px)] px-6 py-6 space-y-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            const isExperiences = link.label === "Experiences";
            return (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-1.5 px-4 py-3 text-base rounded-xl transition-colors duration-200 ${
                    active
                      ? "text-foreground bg-surface-hover font-medium"
                      : "text-muted hover:text-foreground hover:bg-surface-hover"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {isExperiences ? "Curated Experiences" : link.label}
                </Link>
              </div>
            );
          })}

          {/* Dashboards (mobile) */}
          <div className="pt-4 border-t border-border">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Dashboards
            </p>
            <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
              {dashboardRoles
                .filter((r) => !r.hidden)
                .map((r) => (
                  <Link
                    key={r.slug}
                    href={`/${r.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-hover active:scale-95 transition-all duration-200"
                  >
                    <r.icon size={13} className="text-subtle shrink-0" />
                    {r.title.replace(" Dashboard", "")}
                  </Link>
                ))}
            </div>
          </div>

          <div className="pt-4 pb-2 border-t border-border flex items-center gap-2">
            <Link
              href="/login"
              className="flex-1 text-center px-4 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded-full shadow-organic hover:bg-primary-hover active:scale-95 transition-all duration-200"
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
            <div className="w-11 h-11 flex items-center justify-center rounded-full border border-border">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
