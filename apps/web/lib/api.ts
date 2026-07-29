import type { Property } from "./types";

interface ApiRateRule {
  baseNightlyRate: number;
  cleaningFee?: number;
  minNights?: number;
  maxGuests: number;
}

interface ApiListingMedia {
  url: string;
  mediaType: string;
  sortOrder?: number;
}

interface ApiListingTag {
  tag: {
    category: string;
    name: string;
  };
}

interface ApiListingHost {
  userId: string;
  user?: {
    fullName?: string | null;
  };
}

interface ApiListing {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  propertyType: string | null;
  experienceTags: string[];
  dietaryOptions: string[];
  media: ApiListingMedia[];
  tags: ApiListingTag[];
  rateRules: ApiRateRule[];
  host?: ApiListingHost;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
).replace(/\/+$/, "");

function mapListingToProperty(listing: ApiListing): Property {
  const rateRule = listing.rateRules?.[0];

  const tagNames =
    listing.tags
      ?.map((listingTag) => listingTag.tag?.name)
      .filter((name): name is string => Boolean(name)) ?? [];

  const experienceTags = listing.experienceTags ?? [];
  const dietaryOptions = listing.dietaryOptions ?? [];

  const amenities = Array.from(
    new Set([...tagNames, ...experienceTags, ...dietaryOptions]),
  );

  const mediaUrls =
    listing.media
      ?.map((media) => media.url)
      .filter((url): url is string => Boolean(url)) ?? [];

  const images = mediaUrls.length > 0 ? mediaUrls : ["/file.svg"];

  const category = listing.propertyType || "Stay";
  const hostName = listing.host?.user?.fullName || "Dhyana Stays Host";

  return {
    id: listing.id,
    slug: listing.id,
    name: listing.title,
    tagline: listing.description,
    description: listing.description,
    story: listing.description,
    category,
    location: {
      city: listing.city,
      state: listing.state,
      country: listing.country,
      coordinates: {
        lat: listing.latitude ?? 0,
        lng: listing.longitude ?? 0,
      },
    },
    images,
    galleryImages: images,
    price: Math.round((rateRule?.baseNightlyRate ?? 0) / 100),
    rating: 0,
    reviewCount: 0,
    maxGuests: rateRule?.maxGuests ?? 2,

    // These fields are not currently stored in the backend listing model.
    bedrooms: 1,
    bathrooms: 1,
    area: "Details available on request",

    amenities,
    highlights: experienceTags,
    host: {
      name: hostName,
      avatar: "/file.svg",
      since: "",
      responseRate: "",
      responseTime: "",
      bio: `Hosted by ${hostName}`,
      verified: false,
      languages: [],
    },
    houseRules: [],
    cancellationPolicy:
      "The applicable cancellation policy will be shown during booking.",
    badges: Array.from(new Set([...tagNames, ...experienceTags])),
    isFeatured: false,
    isTrending: false,
    sustainability: [],
  };
}

async function parseListingResponse(
  response: Response,
): Promise<ApiListing> {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("This stay could not be found.");
    }

    throw new Error(
      `Unable to fetch stay: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The stay API returned an invalid response.");
  }

  return data as ApiListing;
}

export interface PublicListingsQuery {
  q?: string;
  city?: string;
  cities?: string[];
  propertyType?: string;
  propertyTypes?: string[];
  experienceTags?: string[];
  dietaryOptions?: string[];
  minPrice?: number;
  maxPrice?: number;
  minGuests?: number;
  sort?: "newest" | "price-asc" | "price-desc";
}

export async function getPublicListings(
  query: PublicListingsQuery = {},
  signal?: AbortSignal,
): Promise<Property[]> {
  const params = new URLSearchParams();

  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }

  if (query.city?.trim()) {
    params.set("city", query.city.trim());
  }

  if (query.cities?.length) {
    params.set("cities", query.cities.join(","));
  }

  if (query.propertyType?.trim()) {
    params.set("propertyType", query.propertyType.trim());
  }

  if (query.propertyTypes?.length) {
    params.set("propertyTypes", query.propertyTypes.join(","));
  }

  if (query.experienceTags?.length) {
    params.set("experienceTags", query.experienceTags.join(","));
  }

  if (query.dietaryOptions?.length) {
    params.set("dietaryOptions", query.dietaryOptions.join(","));
  }

  if (query.minPrice !== undefined) {
    params.set("minPrice", String(query.minPrice));
  }

  if (query.maxPrice !== undefined) {
    params.set("maxPrice", String(query.maxPrice));
  }

  if (query.minGuests !== undefined) {
    params.set("minGuests", String(query.minGuests));
  }

  if (query.sort) {
    params.set("sort", query.sort);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `${API_BASE_URL}/listings?${queryString}`
    : `${API_BASE_URL}/listings`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch listings: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("The listings API returned an invalid response.");
  }

  return (data as ApiListing[]).map(mapListingToProperty);
}


export interface ListingFacets {
  experienceTags: string[];
  propertyTypes: string[];
  dietaryOptions: string[];
}

export async function getListingFacets(
  signal?: AbortSignal,
): Promise<ListingFacets> {
  const response = await fetch(`${API_BASE_URL}/listings/meta/facets`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch listing filters: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The listing-facets API returned an invalid response.");
  }

  const facets = data as Partial<ListingFacets>;

  return {
    experienceTags: Array.isArray(facets.experienceTags)
      ? facets.experienceTags
      : [],
    propertyTypes: Array.isArray(facets.propertyTypes)
      ? facets.propertyTypes
      : [],
    dietaryOptions: Array.isArray(facets.dietaryOptions)
      ? facets.dietaryOptions
      : [],
  };
}

export async function getPublicListingById(
  id: string,
  signal?: AbortSignal,
): Promise<Property> {
  const response = await fetch(
    `${API_BASE_URL}/listings/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    },
  );

  const listing = await parseListingResponse(response);
  return mapListingToProperty(listing);
}
