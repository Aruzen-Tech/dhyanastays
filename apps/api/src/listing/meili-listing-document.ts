export interface MeiliListingSource {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  country: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  experienceTags: string[];
  propertyType: string | null;
  dietaryOptions: string[];
  createdAt: Date | string;
  rateRules?: Array<{
    baseNightlyRate: number;
    maxGuests: number;
  }>;
}

export interface MeiliListingDocument {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  country: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  experienceTags: string[];
  propertyType: string | null;
  dietaryOptions: string[];
  baseNightlyRate: number;
  maxGuests: number;
  createdAt: string;
}

export function toMeiliListingDocument(
  listing: MeiliListingSource,
): MeiliListingDocument {
  const rateRule = listing.rateRules?.[0];

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    city: listing.city,
    state: listing.state,
    country: listing.country,
    status: listing.status,
    latitude: listing.latitude,
    longitude: listing.longitude,
    experienceTags: listing.experienceTags,
    propertyType: listing.propertyType,
    dietaryOptions: listing.dietaryOptions,
    baseNightlyRate: rateRule?.baseNightlyRate ?? 0,
    maxGuests: rateRule?.maxGuests ?? 2,
    createdAt:
      listing.createdAt instanceof Date
        ? listing.createdAt.toISOString()
        : listing.createdAt,
  };
}
