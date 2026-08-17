'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/** Maximum rotation at the very edge of the element, in degrees. Kept low
 *  deliberately: this is meant to register as the card having weight, not as
 *  an animation playing. Past roughly 10° the photo's perspective distortion
 *  reads as a rendering fault rather than as depth. */
const MAX_TILT_DEGREES = 4;

/**
 * Pointer-tracked 3D tilt.
 *
 * Returns a ref plus the two handlers an element needs to lean toward the
 * cursor. The element is expected to consume four custom properties, which
 * this hook keeps up to date:
 *
 *   --tilt-x / --tilt-y  rotation, for a `rotateX()` / `rotateY()` transform
 *   --pointer-x/-y       cursor position as a %, for a specular highlight
 *
 * Two deliberate constraints:
 *
 *   - Values are written straight onto the DOM node instead of through state.
 *     A pointermove-driven setState would re-render on every frame of a mouse
 *     sweep, and in a carousel that cost is paid per card.
 *   - Tilt is offered only to devices with a real pointer, and never to
 *     someone who asked for reduced motion. On touch, `enabled` stays false
 *     and the custom properties are never written, so the element renders
 *     flat with no transform to fight the browser's own scrolling.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => setEnabled(finePointer.matches && !reducedMotion.matches);
    sync();

    finePointer.addEventListener('change', sync);
    reducedMotion.addEventListener('change', sync);
    return () => {
      finePointer.removeEventListener('change', sync);
      reducedMotion.removeEventListener('change', sync);
    };
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      const element = ref.current;
      if (!element || !enabled) return;

      const rect = element.getBoundingClientRect();
      const ratioX = (event.clientX - rect.left) / rect.width;
      const ratioY = (event.clientY - rect.top) / rect.height;

      // Y drives rotateX and is negated: pointer below centre should tip the
      // far edge away, which is a negative rotation about the X axis.
      element.style.setProperty('--tilt-x', `${-(ratioY - 0.5) * 2 * MAX_TILT_DEGREES}deg`);
      element.style.setProperty('--tilt-y', `${(ratioX - 0.5) * 2 * MAX_TILT_DEGREES}deg`);
      element.style.setProperty('--pointer-x', `${ratioX * 100}%`);
      element.style.setProperty('--pointer-y', `${ratioY * 100}%`);
    },
    [enabled],
  );

  const onPointerLeave = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    // Only the rotation resets; the pointer position is left where it was so
    // the highlight fades out in place rather than sliding back to centre.
    element.style.setProperty('--tilt-x', '0deg');
    element.style.setProperty('--tilt-y', '0deg');
  }, []);

  return { ref, enabled, onPointerMove, onPointerLeave };
}
