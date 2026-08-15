'use client';

import Link from 'next/link';
import { isItemActive, type NavItem } from '../../lib/navigation';

interface Props {
  item: NavItem;
  pathname: string;
  /** top-level: desktop row (+ its hidden measurement clone). panel: inside
   * the More dropdown. mobile: the stacked drawer. */
  variant: 'top-level' | 'panel' | 'mobile';
  onClick?: () => void;
}

/**
 * The single link renderer shared by the measurement clone, the live
 * desktop row, More-menu panel rows, and the mobile drawer — one place
 * computing active state, so width measurement can never diverge from what
 * the live row actually shows.
 */
export default function NavigationItem({ item, pathname, variant, onClick }: Props) {
  const active = isItemActive(item, pathname);
  const danger = item.emphasis === 'danger';

  if (variant === 'top-level') {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        title={item.title}
        className={`relative h-full flex items-center whitespace-nowrap text-sm transition-colors ${
          danger
            ? 'font-semibold text-red-600 hover:text-red-700'
            : active
              ? 'text-brand-700 font-semibold'
              : 'text-gray-500 hover:text-brand-700'
        }`}
      >
        {item.label}
        {/* Bottom border sits flush with the header's own bottom edge (this
            Link is h-full, matching DesktopNavigation's h-16 container, so
            bottom-0 lands at the header's true bottom, not just below the
            text). inset-x-0 with no horizontal padding on this Link means
            its width exactly matches the label text — not a fixed/arbitrary
            width, and not stretched to the item's full clickable box beyond
            the text. scale-x (not width) transitions for a smooth,
            GPU-cheap grow-from-center animation. */}
        {!danger && (
          <span
            className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-brand-700 origin-center transition-transform duration-200 ${
              active ? 'scale-x-100' : 'scale-x-0'
            }`}
          />
        )}
      </Link>
    );
  }

  if (variant === 'panel') {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        title={item.title}
        className={`block px-3.5 py-1.5 mb-0.5 text-sm rounded-lg break-inside-avoid transition-colors ${
          danger
            ? 'text-red-600 hover:bg-red-50 font-medium'
            : active
              ? 'text-brand-700 bg-brand-50 font-medium'
              : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
        }`}
      >
        {item.label}
      </Link>
    );
  }

  // mobile
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={item.title}
      className={`flex items-center min-h-11 px-3 py-2.5 text-sm rounded-xl transition-colors ${
        danger
          ? 'text-red-600 font-semibold'
          : active
            ? 'text-brand-700 bg-brand-50 font-semibold'
            : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
      }`}
    >
      {item.label}
    </Link>
  );
}
