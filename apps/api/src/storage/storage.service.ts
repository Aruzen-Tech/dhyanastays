import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  key: string;       // S3 object key
  url: string;       // Public URL (CDN or direct)
  size: number;
  mimeType: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;   // PUT to this URL
  publicUrl: string;   // Final public URL after upload
  key: string;
  expiresIn: number;   // seconds
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: string;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly cdnUrl: string;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get<string>('STORAGE_PROVIDER', 'stub');
    this.bucket = config.get<string>('S3_BUCKET', 'dhyana-stays-media');
    this.region = config.get<string>('S3_REGION', 'ap-south-1');
    this.endpoint = config.get<string>('S3_ENDPOINT', '');
    this.accessKeyId = config.get<string>('S3_ACCESS_KEY_ID', '');
    this.secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY', '');
    this.cdnUrl = config.get<string>('CDN_URL', '');

    if (this.provider === 'stub' && config.get<string>('NODE_ENV') === 'production') {
      throw new Error('STORAGE_PROVIDER must be s3 or r2 in production (not stub)');
    }
  }

  /**
   * Generate a presigned PUT URL for direct browser-to-S3 upload.
   * Returns the upload URL and the final public URL.
   */
  async getPresignedUploadUrl(
    folder: string,
    filename: string,
    mimeType: string,
    expiresIn = 300,
  ): Promise<PresignedUrlResult> {
    const ext = path.extname(filename) || this.mimeToExt(mimeType);
    const key = `${folder}/${randomUUID()}${ext}`;

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

  /**
   * Delete an object by key.
   */
  async deleteObject(key: string): Promise<void> {
    if (this.provider === 'stub') {
      this.logger.log(`[STORAGE STUB] Delete key: ${key}`);
      return;
    }
    await this.s3Delete(key);
  }

  /**
   * Server-side upload of rendered bytes (Stay Pass tickets, PDFs, etc.).
   * Real providers: presigned SigV4 PUT executed from this process.
   * Stub: bytes are written under `.stub-storage/` and served back by
   * `GET /api/storage/stub/*` so local dev renders are actually viewable.
   */
  async putObject(
    key: string,
    bytes: Buffer,
    contentType: string,
  ): Promise<{ key: string; publicUrl: string }> {
    if (this.provider === 'stub') {
      const filePath = path.join(StorageService.stubDir(), key);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, bytes);
      this.logger.log(`[STORAGE STUB] putObject ${key} (${bytes.length} bytes)`);
      const base = this.config.get<string>('API_URL', 'http://localhost:3001');
      return { key, publicUrl: `${base.replace(/\/$/, '')}/api/storage/stub/${key}` };
    }

    const uploadUrl = await this.generatePresignedPutUrl(key, contentType, 300);
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(bytes),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`putObject failed for ${key}: ${res.status} ${text.slice(0, 300)}`);
    }
    return { key, publicUrl: this.buildPublicUrl(key) };
  }

  /** Read a stub-stored object (dev only). Returns null when absent. */
  async readStubObject(key: string): Promise<Buffer | null> {
    if (this.provider !== 'stub') return null;
    const filePath = path.join(StorageService.stubDir(), key);
    // Containment check — key comes from a URL wildcard.
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(StorageService.stubDir()))) return null;
    try {
      return await fs.promises.readFile(resolved);
    } catch {
      return null;
    }
  }

  /** Local directory backing stub storage (gitignored). */
  static stubDir(): string {
    return path.join(process.cwd(), '.stub-storage');
  }

  /**
   * Build the public URL for a given key.
   */
  buildPublicUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl.replace(/\/$/, '')}/${key}`;
    }
    if (this.provider === 'r2') {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }
    // AWS S3
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  // ── AWS Signature V4 presigned PUT ─────────────────────────────────────────
  // Implemented without @aws-sdk to avoid heavy dependency.
  // Compatible with S3 and Cloudflare R2 (both use SigV4).

  private async generatePresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn: number,
  ): Promise<string> {
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

  private async s3Delete(key: string): Promise<void> {
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

  // ── Crypto helpers (Node built-ins only — no extra deps) ───────────────────

  private sha256Hex(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private hmacHex(key: Buffer | string, data: string): string {
    return createHmac('sha256', key).update(data).digest('hex');
  }

  private hmacBuffer(key: Buffer | string, data: string): Buffer {
    return createHmac('sha256', key).update(data).digest();
  }

  private getSigningKey(dateStamp: string, region: string, service: string): Buffer {
    const kDate = this.hmacBuffer(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmacBuffer(kDate, region);
    const kService = this.hmacBuffer(kRegion, service);
    return this.hmacBuffer(kService, 'aws4_request');
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
    };
    return map[mime] ?? '.bin';
  }
}
