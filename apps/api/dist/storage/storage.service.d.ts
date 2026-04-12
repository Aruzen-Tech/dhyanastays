import { ConfigService } from '@nestjs/config';
export interface UploadResult {
    key: string;
    url: string;
    size: number;
    mimeType: string;
}
export interface PresignedUrlResult {
    uploadUrl: string;
    publicUrl: string;
    key: string;
    expiresIn: number;
}
export declare class StorageService {
    private readonly config;
    private readonly logger;
    private readonly provider;
    private readonly bucket;
    private readonly region;
    private readonly endpoint;
    private readonly accessKeyId;
    private readonly secretAccessKey;
    private readonly cdnUrl;
    constructor(config: ConfigService);
    getPresignedUploadUrl(folder: string, filename: string, mimeType: string, expiresIn?: number): Promise<PresignedUrlResult>;
    deleteObject(key: string): Promise<void>;
    buildPublicUrl(key: string): string;
    private generatePresignedPutUrl;
    private s3Delete;
    private sha256Hex;
    private hmacHex;
    private hmacBuffer;
    private getSigningKey;
    private mimeToExt;
}
