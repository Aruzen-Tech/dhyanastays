"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
let StorageService = StorageService_1 = class StorageService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(StorageService_1.name);
        this.provider = config.get('STORAGE_PROVIDER', 'stub');
        this.bucket = config.get('S3_BUCKET', 'dhyana-stays-media');
        this.region = config.get('S3_REGION', 'ap-south-1');
        this.endpoint = config.get('S3_ENDPOINT', '');
        this.accessKeyId = config.get('S3_ACCESS_KEY_ID', '');
        this.secretAccessKey = config.get('S3_SECRET_ACCESS_KEY', '');
        this.cdnUrl = config.get('CDN_URL', '');
        if (this.provider === 'stub' && config.get('NODE_ENV') === 'production') {
            throw new Error('STORAGE_PROVIDER must be s3 or r2 in production (not stub)');
        }
    }
    async getPresignedUploadUrl(folder, filename, mimeType, expiresIn = 300) {
        const ext = path.extname(filename) || this.mimeToExt(mimeType);
        const key = `${folder}/${(0, crypto_1.randomUUID)()}${ext}`;
        if (this.provider === 'stub') {
            this.logger.log(`[STORAGE STUB] Presigned URL for key: ${key}`);
            return {
                uploadUrl: `http://localhost:3001/api/storage/stub-upload/${key}`,
                publicUrl: `http://localhost:3001/api/storage/stub/${key}`,
                key,
                expiresIn,
            };
        }
        const publicUrl = this.buildPublicUrl(key);
        const uploadUrl = await this.generatePresignedPutUrl(key, mimeType, expiresIn);
        return { uploadUrl, publicUrl, key, expiresIn };
    }
    async deleteObject(key) {
        if (this.provider === 'stub') {
            this.logger.log(`[STORAGE STUB] Delete key: ${key}`);
            return;
        }
        await this.s3Delete(key);
    }
    buildPublicUrl(key) {
        if (this.cdnUrl) {
            return `${this.cdnUrl.replace(/\/$/, '')}/${key}`;
        }
        if (this.provider === 'r2') {
            return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
        }
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
    async generatePresignedPutUrl(key, contentType, expiresIn) {
        const now = new Date();
        const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const service = 's3';
        const region = this.provider === 'r2' ? 'auto' : this.region;
        const host = this.provider === 'r2'
            ? new URL(this.endpoint).host + `/${this.bucket}`
            : `${this.bucket}.s3.${region}.amazonaws.com`;
        const baseUrl = this.provider === 'r2'
            ? `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`
            : `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        const credential = `${this.accessKeyId}/${credentialScope}`;
        const queryParams = new URLSearchParams({
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': credential,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': String(expiresIn),
            'X-Amz-SignedHeaders': 'content-type;host',
        });
        const canonicalRequest = [
            'PUT',
            `/${key}`,
            queryParams.toString(),
            `content-type:${contentType}\nhost:${host}\n`,
            'content-type;host',
            'UNSIGNED-PAYLOAD',
        ].join('\n');
        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            credentialScope,
            this.sha256Hex(canonicalRequest),
        ].join('\n');
        const signingKey = this.getSigningKey(dateStamp, region, service);
        const signature = this.hmacHex(signingKey, stringToSign);
        queryParams.set('X-Amz-Signature', signature);
        return `${baseUrl}?${queryParams.toString()}`;
    }
    async s3Delete(key) {
        const now = new Date();
        const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const region = this.provider === 'r2' ? 'auto' : this.region;
        const service = 's3';
        const host = this.provider === 'r2'
            ? new URL(this.endpoint).host + `/${this.bucket}`
            : `${this.bucket}.s3.${region}.amazonaws.com`;
        const url = this.provider === 'r2'
            ? `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`
            : `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        const canonicalRequest = [
            'DELETE',
            `/${key}`,
            '',
            `host:${host}\nx-amz-date:${amzDate}\n`,
            'host;x-amz-date',
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        ].join('\n');
        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            credentialScope,
            this.sha256Hex(canonicalRequest),
        ].join('\n');
        const signingKey = this.getSigningKey(dateStamp, region, service);
        const signature = this.hmacHex(signingKey, stringToSign);
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                Host: host,
                'x-amz-date': amzDate,
                Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${signature}`,
            },
        });
        if (!res.ok && res.status !== 204) {
            throw new Error(`S3 delete failed: ${res.status}`);
        }
    }
    sha256Hex(data) {
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    hmacHex(key, data) {
        const { createHmac } = require('crypto');
        return createHmac('sha256', key).update(data).digest('hex');
    }
    hmacBuffer(key, data) {
        const { createHmac } = require('crypto');
        return createHmac('sha256', key).update(data).digest();
    }
    getSigningKey(dateStamp, region, service) {
        const kDate = this.hmacBuffer(`AWS4${this.secretAccessKey}`, dateStamp);
        const kRegion = this.hmacBuffer(kDate, region);
        const kService = this.hmacBuffer(kRegion, service);
        return this.hmacBuffer(kService, 'aws4_request');
    }
    mimeToExt(mime) {
        const map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
            'application/pdf': '.pdf',
        };
        return map[mime] ?? '.bin';
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map