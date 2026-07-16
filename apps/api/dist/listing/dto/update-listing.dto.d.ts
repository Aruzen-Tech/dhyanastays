export declare const EXPERIENCE_TAGS: readonly ["yoga", "meditation", "ayurveda", "sound-healing", "detox", "spa", "silent-retreat", "nature", "hiking", "cooking"];
export declare const PROPERTY_TYPES: readonly ["villa", "cottage", "ashram", "homestay", "resort", "farmstay", "boutique-hotel"];
export declare const DIETARY_OPTIONS: readonly ["vegetarian", "vegan", "gluten-free", "ayurvedic", "jain", "sattvic", "non-veg-available"];
export declare class UpdateListingDto {
    title?: string;
    description?: string;
    city?: string;
    state?: string;
    country?: string;
    baseNightlyRate?: number;
    maxGuests?: number;
    minNights?: number;
    cleaningFee?: number;
    latitude?: number;
    longitude?: number;
    experienceTags?: string[];
    propertyType?: string;
    dietaryOptions?: string[];
}
