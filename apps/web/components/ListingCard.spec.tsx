// @vitest-environment jsdom

import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
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
    linkedContent.getByText('4 guests');
  });

  it('renders a photo (real media if present, otherwise a mock placeholder) with proper alt text', () => {
    const { getByRole } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const img = getByRole('img', { name: 'Forest Canopy Retreat' });

    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBeTruthy();
  });

  it('prefers real listing media over the mock placeholder when media is present', () => {
    const { getByRole } = render(
      createElement(ListingCard, {
        listing: {
          ...listingFixture,
          media: [{ id: 'm1', listingId: 'listing-001', url: 'https://cdn.example.com/real-photo.jpg', mediaType: 'image', sortOrder: 0, createdAt: '2026-07-18T00:00:00.000Z' }],
        },
      }),
    );

    const img = getByRole('img', { name: 'Forest Canopy Retreat' });

    expect(img.getAttribute('src')).toBe('https://cdn.example.com/real-photo.jpg');
  });

  it('falls back to the decorative svg placeholder if the photo fails to load', () => {
    const { container, getByRole } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const img = getByRole('img', { name: 'Forest Canopy Retreat' });
    fireEvent.error(img);

    const svg = container.querySelector('svg');

    expect(container.querySelector('img')).toBeNull();
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('aria-label')).toBeNull();
  });

  it('renders decorative metadata icons while keeping readable text accessible', () => {
    const { getByRole, container } = render(
      createElement(ListingCard, { listing: listingFixture }),
    );

    const link = getByRole('link');
    const linkedContent = within(link);
    const decorativeIcons = container.querySelectorAll('svg[aria-hidden="true"]');

    expect(decorativeIcons.length).toBeGreaterThan(0);

    for (const icon of decorativeIcons) {
      expect(icon.getAttribute('focusable')).toBe('false');
    }

    linkedContent.getByText('Rishikesh, Uttarakhand');
    linkedContent.getByText('4 guests');
    linkedContent.getByRole('heading', { name: 'Forest Canopy Retreat' });
  });
});
