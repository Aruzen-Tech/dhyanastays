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
export declare function toMeiliListingDocument(listing: MeiliListingSource): MeiliListingDocument;
