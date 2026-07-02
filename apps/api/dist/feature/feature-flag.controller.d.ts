import { RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureFlagService } from './feature-flag.service';
declare class ToggleFeatureDto {
    enabled: boolean;
}
declare class BulkToggleItem {
    key: string;
    enabled: boolean;
}
declare class BulkToggleDto {
    updates: BulkToggleItem[];
}
export declare class AdminFeatureFlagController {
    private readonly featureFlags;
    constructor(featureFlags: FeatureFlagService);
    list(): Promise<import("./feature-flag.service").ResolvedFeature[]>;
    bulk(user: RequestUser, dto: BulkToggleDto): Promise<import("./feature-flag.service").ResolvedFeature[]>;
    toggle(user: RequestUser, key: string, dto: ToggleFeatureDto): Promise<import("./feature-flag.service").ResolvedFeature>;
}
export declare class PublicFeatureFlagController {
    private readonly featureFlags;
    constructor(featureFlags: FeatureFlagService);
    enabledMap(): Promise<Record<string, boolean>>;
}
export {};
