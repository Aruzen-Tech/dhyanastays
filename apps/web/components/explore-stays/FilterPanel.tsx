'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StayFilterPanelContent, { type StayFilterPanelProps } from './StayFilterPanelContent';
import { IconX } from './icons';

interface Props extends StayFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  resultCount: number;
}

// No animation library exists in package.json (checked) — this app's only
// prior animation convention is Tailwind's own keyframe utilities
// (fade-in/slide-up/scale-in in tailwind.config.ts). Rather than add a
// dependency, the slide uses that same convention: a plain CSS
// `transition-transform`, toggled via `translate-x`. A deliberately slow,
// no-overshoot easing curve (expo-out) gives the "premium, unhurried" feel
// without any bounce.
const SLIDE_DURATION_MS = 650;
const PREMIUM_EASE = 'cubic-bezier(0.16,1,0.3,1)';

/**
 * On-demand filter drawer, triggered by the "Filters" button in StayToolbar —
 * replaces the old permanently-visible desktop rail. Slides in from the left
 * at every breakpoint (near-full-width on mobile, fixed width from `sm:` up).
 * The panel stays mounted at all times (visibility/position are purely CSS)
 * so both the open AND close transitions can play — a conditional
 * `if (!isOpen) return null` would skip the closing animation entirely.
 * Filtering is real-time — every control in StayFilterPanelContent writes
 * straight to app/page.tsx's existing filter state — so "Show N stays"
 * below just closes the drawer onto results that are already live-updated;
 * it's not a second, separate "Apply" step.
 */
export default function FilterPanel({ isOpen, onClose, resultCount, ...panelProps }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // `document` exists on the client from its very first render, but not on
  // the server — so a bare `typeof document === 'undefined'` guard produces
  // different output between the server-rendered HTML and the client's
  // initial (pre-hydration) render, which React flags as a hydration
  // mismatch. Deferring the portal to a post-mount effect keeps the client's
  // first render identical to the server's (both render nothing), and only
  // adds the portal in a separate client-only update afterwards.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Simple focus trap: keep Tab cycling within the drawer while open.
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        style={{ transitionDuration: `${SLIDE_DURATION_MS}ms`, opacity: isOpen ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter stays"
        className="absolute inset-y-0 left-0 h-full w-[88vw] max-w-[380px] sm:w-[420px] sm:max-w-[420px] flex flex-col bg-white rounded-r-[28px] shadow-glass transition-transform"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transitionDuration: `${SLIDE_DURATION_MS}ms`,
          transitionTimingFunction: PREMIUM_EASE,
        }}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700/80">
              Refine your search
            </p>
            <h2 className="text-lg font-semibold text-gray-900 mt-0.5">
              Filters
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30"
          >
            <IconX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <StayFilterPanelContent {...panelProps} />
        </div>

        <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          {panelProps.activeFilterCount > 0 && (
            <button
              type="button"
              onClick={panelProps.clearFilters}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 px-2"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-primary flex-1 justify-center"
          >
            Show {resultCount} {resultCount === 1 ? 'stay' : 'stays'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
