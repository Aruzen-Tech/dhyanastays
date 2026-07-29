"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, ChevronUp, Sparkles } from "lucide-react";
import { dashboardRoles, dashboardGroups } from "@/lib/dashboards";
import { LogoMark } from "./Logo";
import TripPlannerWidget from "./TripPlannerWidget";

// Single floating launcher, bottom-right on every page — combines the
// dashboard shortcut and the AI planner into one pill instead of two
// separate floating buttons.
export default function FloatingActions() {
  const [dashOpen, setDashOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dashOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDashOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDashOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dashOpen]);

  return (
    <>
      <div
        ref={wrapperRef}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] origin-bottom-right scale-[0.82] sm:scale-100 transition-opacity ${
          aiOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="flex items-center rounded-full bg-surface border border-border shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
          {/* Dashboard segment */}
          <button
            onClick={() => setDashOpen((v) => !v)}
            aria-expanded={dashOpen}
            aria-label="Open your dashboard shortcuts"
            className={`flex items-center gap-2 pl-2.5 pr-3.5 py-2.5 rounded-l-full transition-colors ${
              dashOpen ? "bg-surface-hover" : "hover:bg-surface-hover"
            }`}
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/12 text-primary shrink-0">
              <LayoutDashboard size={17} />
            </span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Dashboard
            </span>
            <ChevronUp
              size={13}
              className={`text-subtle transition-transform duration-300 ${dashOpen ? "" : "rotate-180"}`}
            />
          </button>

          <span className="w-px h-6 bg-border shrink-0" />

          {/* AI Planner segment */}
          <button
            onClick={() => setAiOpen(true)}
            aria-label="Open AI Trip Planner"
            className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-r-full hover:bg-surface-hover transition-colors"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-background shrink-0">
              <LogoMark size={22} />
            </span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              AI Planner
            </span>
            <Sparkles size={13} className="text-sage shrink-0" />
          </button>
        </div>

        {/* Dashboard panel */}
        {dashOpen && (
          <div className="absolute bottom-full right-0 mb-3 w-[calc(100vw-2rem)] max-w-[600px] max-h-[72vh] overflow-y-auto rounded-[28px] border border-border bg-surface shadow-organic p-5 animate-fade-in">
            <p className="text-[10px] uppercase tracking-wider text-subtle mb-3">
              Choose your dashboard — switch anytime if you hold multiple roles
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6">
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
                              onClick={() => setDashOpen(false)}
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

      <TripPlannerWidget open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
