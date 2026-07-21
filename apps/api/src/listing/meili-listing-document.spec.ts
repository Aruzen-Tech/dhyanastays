import { ListingStatus } from '@prisma/client';
import { toMeiliListingDocument } from './meili-listing-document';

describe('toMeiliListingDocument', () => {
  it('maps Discovery fields and pricing into a Meilisearch document', () => {
    const createdAt = new Date('2026-07-18T10:00:00.000Z');

    const document = toMeiliListingDocument({
      id: 'listing-1',
      title: 'Goa Wellness Resort',
      description: 'A peaceful wellness stay.',
      city: 'Canacona',
      state: 'Goa',
      country: 'India',
      status: ListingStatus.APPROVED,
      latitude: 15.0101,
      longitude: 74.0234,
      experienceTags: ['yoga', 'meditation'],
      propertyType: 'resort',
      dietaryOptions: ['vegetarian', 'vegan'],
      createdAt,
      rateRules: [
        {
          baseNightlyRate: 750000,
          maxGuests: 4,
        },
      ],
    });

    expect(document).toEqual({
      id: 'listing-1',
      title: 'Goa Wellness Resort',
      description: 'A peaceful wellness stay.',
      city: 'Canacona',
      state: 'Goa',
      country: 'India',
      status: ListingStatus.APPROVED,
      latitude: 15.0101,
      longitude: 74.0234,
      experienceTags: ['yoga', 'meditation'],
      propertyType: 'resort',
      dietaryOptions: ['vegetarian', 'vegan'],
      baseNightlyRate: 750000,
      maxGuests: 4,
      createdAt: '2026-07-18T10:00:00.000Z',
    });
  });

  it('uses safe pricing defaults when no rate rule exists', () => {
    const document = toMeiliListingDocument({
      id: 'listing-2',
      title: 'Forest Retreat',
      description: 'A quiet forest stay.',
      city: 'Auroville',
      state: 'Tamil Nadu',
      country: 'India',
      status: ListingStatus.APPROVED,
      latitude: null,
      longitude: null,
      experienceTags: [],
      propertyType: null,
      dietaryOptions: [],
      createdAt: '2026-07-18T11:00:00.000Z',
      rateRules: [],
    });

    expect(document.baseNightlyRate).toBe(0);
    expect(document.maxGuests).toBe(2);
    expect(document.createdAt).toBe('2026-07-18T11:00:00.000Z');
  });
});
