'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// useLayoutEffect warns when it runs during SSR; this swaps to a no-op
// useEffect on the server (matching the purpose of FilterPanel.tsx's
// `mounted` gate elsewhere in this app: defer anything DOM-size-dependent
// to a client-only moment) while staying synchronous-before-paint on the
// client, where it actually needs to run.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface UseOverflowNavResult {
  /** The live, visible row — its width is what "available space" means. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** A hidden clone of the full item list, used only to read real widths. */
  measureRef: React.RefObject<HTMLDivElement | null>;
  /** A hidden clone of the "More" trigger, so its width is reserved correctly. */
  moreButtonRef: React.RefObject<HTMLButtonElement | null>;
  /** How many leading items currently fit. */
  visibleCount: number;
}

/**
 * Hand-rolled "priority navigation": measures the full item list off-screen,
 * observes the live row's container width, and computes how many leading
 * items fit before the "More" trigger is needed — recomputed on resize, not
 * assumed from a fixed breakpoint. No new dependency; ResizeObserver is a
 * native browser API.
 */
export function useOverflowNav(itemCount: number, gapPx: number): UseOverflowNavResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Initial/SSR state: show everything, no "More" — this is also what the
  // client's pre-hydration render produces, so there is no hydration
  // mismatch. The layout effect below corrects this before the client paints.
  const [visibleCount, setVisibleCount] = useState(itemCount);

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const available = container.clientWidth;
    const widths = Array.from(measure.children).map(
      (el) => (el as HTMLElement).getBoundingClientRect().width,
    );
    if (widths.length === 0) {
      setVisibleCount(0);
      return;
    }

    const totalWidth = widths.reduce((sum, w) => sum + w, 0) + gapPx * (widths.length - 1);
    if (totalWidth <= available) {
      setVisibleCount(widths.length);
      return;
    }

    // Overflow exists: reserve the "More" trigger's width up front, then
    // greedily fit leading items into what's left. A single forward pass —
    // "does More fit" is decided once, not iteratively — so this cannot
    // oscillate at a stable container width.
    const moreWidth = (moreButtonRef.current?.getBoundingClientRect().width ?? 72) + gapPx;
    let used = moreWidth;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const next = used + widths[i] + (i > 0 ? gapPx : 0);
      if (next > available) break;
      used = next;
      count++;
    }
    setVisibleCount(count);
  }, [gapPx]);

  useIsomorphicLayoutEffect(() => {
    recalculate();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    // Observes the container's own box, not window.innerWidth — reacts
    // correctly when siblings (logo, auth actions) change size too, not
    // just on viewport resize.
    const observer = new ResizeObserver(() => recalculate());
    observer.observe(container);

    // This app loads fonts via a <link ...&display=swap> (not next/font),
    // so text metrics can shift once the real fonts swap in — re-measure
    // once when that settles.
    document.fonts?.ready.then(recalculate).catch(() => {});

    return () => observer.disconnect();
  }, [recalculate, itemCount]);

  return { containerRef, measureRef, moreButtonRef, visibleCount };
}
