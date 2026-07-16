export declare class QuietHoursDto {
    start: string;
    end: string;
    tz?: string;
}
export declare class UpsertNotificationPreferencesDto {
    channels?: Record<string, Record<string, boolean>>;
    quietHours?: QuietHoursDto;
}
