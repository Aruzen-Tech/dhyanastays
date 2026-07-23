export declare const DIETARY_OPTIONS: string[];
export declare const WELLNESS_OPTIONS: string[];
export declare class UpsertPreferencesDto {
    dietaryNeeds?: string[];
    wellnessInterests?: string[];
    accessibility?: string;
    roomPreference?: string;
    experienceLevel?: string;
    arrivalPreference?: string;
    emergencyContact?: {
        name: string;
        phone: string;
        relation: string;
    };
    notes?: string;
}
