import { RequestUser } from '../common/decorators/current-user.decorator';
import { OutboxService } from './outbox.service';
import { UpsertNotificationPreferencesDto } from './dto/upsert-notification-preferences.dto';
export declare class NotificationPreferenceController {
    private readonly outbox;
    constructor(outbox: OutboxService);
    get(user: RequestUser): Promise<import("./outbox.service").PreferenceBlob>;
    upsert(user: RequestUser, dto: UpsertNotificationPreferencesDto): Promise<import("./outbox.service").PreferenceBlob>;
}
