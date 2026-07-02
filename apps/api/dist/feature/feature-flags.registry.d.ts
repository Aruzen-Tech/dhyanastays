export type FeatureCategory = 'Bookings & Payments' | 'Guest Experience' | 'AI & Concierge' | 'Safety' | 'Loyalty & Growth' | 'Messaging' | 'Investor';
export type FeatureAudience = 'guest' | 'host' | 'admin' | 'investor';
export interface FeatureDefinition {
    key: string;
    label: string;
    description: string;
    category: FeatureCategory;
    defaultEnabled: boolean;
    audience: FeatureAudience[];
    critical?: boolean;
}
export declare const FEATURE_REGISTRY: readonly FeatureDefinition[];
export declare const FEATURE_KEYS: string[];
export declare function getFeatureDefinition(key: string): FeatureDefinition | undefined;
