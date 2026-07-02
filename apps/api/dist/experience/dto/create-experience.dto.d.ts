export declare const EXPERIENCE_CATEGORIES: readonly ["yoga-class", "meditation", "ayurveda", "sound-healing", "cooking-class", "guided-hike", "retreat-day", "wellness-workshop", "spa-session", "cultural-tour"];
export declare class CreateExperienceDto {
    title: string;
    description: string;
    category: string;
    city: string;
    state: string;
    country?: string;
    listingId?: string;
    latitude?: number;
    longitude?: number;
    startsAt: string;
    endsAt: string;
    capacity: number;
    priceMinor: number;
    imageUrl?: string;
}
