import type { CSSProperties } from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

/** Only the corner radius differs per variant — fill, shimmer and dark-mode
 *  handling all come from the shared `.skeleton` class in globals.css, so
 *  there is exactly one place that decides what a loading placeholder looks
 *  like across the app. */
const VARIANT_RADIUS: Record<SkeletonVariant, string> = {
  text: 'rounded-md',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-2xl',
};

interface Props {
  /** Defaults to `text`, the common case. */
  variant?: SkeletonVariant;
  /** Any CSS length. Prefer Tailwind classes for responsive sizes; use these
   *  only for one-off fixed dimensions. */
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Loading placeholder primitive.
 *
 * Wraps the existing `.skeleton` component class — a light neutral fill with
 * a sweeping shimmer, already defined for both themes — behind the same
 * variant vocabulary the reference uses (text / circular / rectangular /
 * rounded). Callers pick a shape and a size; nothing else.
 *
 * Sizing is deliberately left to the caller rather than defaulted, because a
 * placeholder is only worth anything if it matches the real element's box
 * exactly. A skeleton that guesses its own height is a skeleton that makes
 * the page jump when the data lands.
 *
 * `aria-hidden` throughout: these carry no information, and the screens using
 * them already announce loading state through a live region.
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style,
}: Props) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block ${VARIANT_RADIUS[variant]} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}
