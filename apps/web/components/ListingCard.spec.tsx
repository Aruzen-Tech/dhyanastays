// @vitest-environment jsdom

import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import type { Listing } from '../lib/types';
import ListingCard from './ListingCard';

vi.mock('./WishlistButton', () => ({
  default: () => createElement('button', { type: 'button' }, 'Add to wishlist'),
}));

afterEach(cleanup);

const listingFixture: Listing = {
  id: 'listing-001',
  hostId: 'host-001',
  createdById: 'user-001',
  title: 'Forest Canopy Retreat',
  description: 'Quiet stay with a tree canopy view.',
  city: 'Rishikesh',
  state: 'Uttarakhand',
  country: 'India',
  latitude: 30.0869,
  longitude: 78.2676,
  timezone: 'Asia/Kolkata',
  status: 'APPROVED',
  needsReapproval: false,
  createdAt: '2026-07-18T00:00:00.000Z',
  updatedAt: '2026-07-18T00:00:00.000Z',
  rateRules: [
    {
      id: 'rate-001',
      listingId: 'listing-001',
      baseNightlyRate: 125000,
      cleaningFee: 0,
      minNights: 1,
      maxGuests: 4,
    },
  ],
};

describe('ListingCard', () => {
  it('renders an article root card shell', () => {
    const { container } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    expect(container.firstElementChild?.tagName).toBe('ARTICLE');
  });

  it('renders exactly one primary link to the listing detail page', () => {
    const { getAllByRole } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const links = getAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/listings/listing-001');
  });

  it('keeps the wishlist button outside the primary link', () => {
    const { getByRole, container } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const article = container.querySelector('article');
    const link = getByRole('link');
    const wishlistButton = getByRole('button', { name: 'Add to wishlist' });

    expect(article).not.toBeNull();
    expect(article?.contains(link)).toBe(true);
    expect(article?.contains(wishlistButton)).toBe(true);
    expect(link.contains(wishlistButton)).toBe(false);
  });

  it('keeps title, location, price, and guest capacity inside the primary link', () => {
    const { getByRole } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const link = getByRole('link');
    const linkedContent = within(link);

    linkedContent.getByRole('heading', { name: 'Forest Canopy Retreat' });
    linkedContent.getByText('Rishikesh, Uttarakhand');
    linkedContent.getByText('\u20b91,250');
    linkedContent.getByText(/\/ night/i);
    linkedContent.getByText('Up to 4');
  });

  it('renders the fallback svg as decorative only', () => {
    const { container } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('aria-label')).toBeNull();
  });

  it('hides decorative emoji while keeping readable location and guest text', () => {
    const { getByRole, getByText, getAllByText } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const link = getByRole('link');
    const linkedContent = within(link);
    const emojiNodes = getAllByText(/📍|👥/);

    expect(emojiNodes).toHaveLength(2);

    for (const emojiNode of emojiNodes) {
      expect(emojiNode.getAttribute('aria-hidden')).toBe('true');
    }

    linkedContent.getByText('Rishikesh, Uttarakhand');
    linkedContent.getByText('Up to 4');
    linkedContent.getByRole('heading', { name: 'Forest Canopy Retreat' });
  });
});
