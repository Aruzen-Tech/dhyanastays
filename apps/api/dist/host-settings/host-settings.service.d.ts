import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagService } from '../feature/feature-flag.service';
export interface HostSettingsDto {
    instantBook?: boolean;
    allowGuestMessages?: boolean;
    allowConciergeChat?: boolean;
    emailOnNewBooking?: boolean;
    smsOnNewBooking?: boolean;
}
export declare class HostSettingsService {
    private readonly prisma;
    private readonly featureFlags;
    constructor(prisma: PrismaService, featureFlags: FeatureFlagService);
    private hostIdFor;
    getForHost(userId: string): Promise<{
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
    update(userId: string, dto: HostSettingsDto): Promise<{
        updatedAt: Date;
        hostId: string;
        instantBook: boolean;
        allowGuestMessages: boolean;
        allowConciergeChat: boolean;
        emailOnNewBooking: boolean;
        smsOnNewBooking: boolean;
    }>;
    private settingByHostUserId;
    allowsGuestMessages(hostUserId: string): Promise<boolean>;
    allowsConciergeChat(hostUserId: string): Promise<boolean>;
}
