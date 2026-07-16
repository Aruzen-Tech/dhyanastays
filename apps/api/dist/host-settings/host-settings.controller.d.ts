import { RequestUser } from '../common/decorators/current-user.decorator';
import { HostSettingsService } from './host-settings.service';
declare class UpdateHostSettingsDto {
    instantBook?: boolean;
    allowGuestMessages?: boolean;
    allowConciergeChat?: boolean;
    emailOnNewBooking?: boolean;
    smsOnNewBooking?: boolean;
}
export declare class HostSettingsController {
    private readonly hostSettings;
    constructor(hostSettings: HostSettingsService);
    get(user: RequestUser): Promise<{
        settings: {
            updatedAt: Date;
            hostId: string;
            instantBook: boolean;
            allowGuestMessages: boolean;
            allowConciergeChat: boolean;
            emailOnNewBooking: boolean;
            smsOnNewBooking: boolean;
        };
        features: {
            key: string;
            label: string;
            description: string;
            category: import("../feature/feature-flags.registry").FeatureCategory;
            enabled: boolean;
        }[];
    }>;
    update(user: RequestUser, dto: UpdateHostSettingsDto): Promise<{
        updatedAt: Date;
        hostId: string;
        instantBook: boolean;
        allowGuestMessages: boolean;
        allowConciergeChat: boolean;
        emailOnNewBooking: boolean;
        smsOnNewBooking: boolean;
    }>;
}
export {};
