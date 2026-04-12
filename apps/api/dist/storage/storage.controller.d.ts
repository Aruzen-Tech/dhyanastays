import { RequestUser } from '../common/decorators/current-user.decorator';
import { StorageService } from './storage.service';
export declare class StorageController {
    private readonly storage;
    constructor(storage: StorageService);
    getPresignedUrl(user: RequestUser, body: {
        filename: string;
        mimeType: string;
        folder?: string;
    }): Promise<import("./storage.service").PresignedUrlResult>;
    deleteObject(user: RequestUser, key: string): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
    stubGet(key: string): string;
}
