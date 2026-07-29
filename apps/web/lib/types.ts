export interface Property {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  story: string;
  category: string;
  location: {
    city: string;
    state: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  images: string[];
  galleryImages: string[];
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  area: string;
  amenities: string[];
  highlights: string[];
  host: {
    name: string;
    avatar: string;
    since: string;
    responseRate: string;
    responseTime: string;
    bio: string;
    verified: boolean;
    languages: string[];
  };
  houseRules: string[];
  cancellationPolicy: string;
  badges: string[];
  isFeatured: boolean;
  isTrending: boolean;
  sustainability: string[];
}
