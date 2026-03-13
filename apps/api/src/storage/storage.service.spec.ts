/**
 * StorageService — Unit Tests
 *
 * Tests all 3 provider branches (stub/s3/r2):
 *   - getPresignedUploadUrl: URL shape, SigV4 params, key generation, mime-to-ext
 *   - deleteObject: stub (no fetch), s3/r2 (fetch DELETE with SigV4 Authorization)
 *   - buildPublicUrl: CDN prefix, S3 format, R2 format
 *
 * No real S3/R2 calls — global fetch is mocked via jest.spyOn.
 */

import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

// ─── Helper: build a ConfigService stub ──────────────────────────────────────
function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const defaults: Record<string, string> = {
    STORAGE_PROVIDER: 'stub',
    S3_BUCKET: 'dhyana-stays-media',
    S3_REGION: 'ap-south-1',
    S3_ENDPOINT: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
    CDN_URL: '',
    ...overrides,
  };
  return {
    get: jest.fn(<T>(key: string, fallback?: T): T => {
      const val = defaults[key];
      return (val !== undefined ? val : fallback) as T;
    }),
  } as unknown as ConfigService;
}

// ─── S3 config fixture ────────────────────────────────────────────────────────
const S3_CONFIG = {
  STORAGE_PROVIDER: 's3',
  S3_BUCKET: 'dhyana-stays-media',
  S3_REGION: 'ap-south-1',
  S3_ACCESS_KEY_ID: 'AKIATEST123456',
  S3_SECRET_ACCESS_KEY: 'secret-key-test-value',
  CDN_URL: '',
};

// ─── R2 config fixture ────────────────────────────────────────────────────────
const R2_CONFIG = {
  STORAGE_PROVIDER: 'r2',
  S3_BUCKET: 'dhyana-stays-media',
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://abc123.r2.cloudflarestorage.com',
  S3_ACCESS_KEY_ID: 'r2-access-key-test',
  S3_SECRET_ACCESS_KEY: 'r2-secret-key-test',
  CDN_URL: '',
};

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('StorageService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STUB PROVIDER
  // ══════════════════════════════════════════════════════════════════════════

  describe('stub provider', () => {
    it('getPresignedUploadUrl returns localhost uploadUrl and publicUrl', async () => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('localhost:3001');
      expect(result.publicUrl).toContain('localhost:3001');
      expect(result.expiresIn).toBe(300);
    });

    it('getPresignedUploadUrl generates a unique key with correct folder and extension', async () => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.key).toMatch(/^listings\/user-1\/.+\.jpg$/);
    });

    it('getPresignedUploadUrl generates unique keys on each call', async () => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      const r1 = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');
      const r2 = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');
      expect(r1.key).not.toBe(r2.key);
    });

    it('getPresignedUploadUrl respects custom expiresIn', async () => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg', 600);
      expect(result.expiresIn).toBe(600);
    });

    it('deleteObject does not call fetch', async () => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      await svc.deleteObject('listings/user-1/photo.jpg');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('deleteObject resolves without throwing', async () => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      await expect(svc.deleteObject('any/key.jpg')).resolves.toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // buildPublicUrl
  // ══════════════════════════════════════════════════════════════════════════

  describe('buildPublicUrl', () => {
    it('uses CDN_URL prefix when CDN_URL is set', () => {
      const svc = new StorageService(makeConfig({
        STORAGE_PROVIDER: 's3',
        CDN_URL: 'https://cdn.dhyanastays.com',
      }));
      expect(svc.buildPublicUrl('listings/user-1/photo.jpg'))
        .toBe('https://cdn.dhyanastays.com/listings/user-1/photo.jpg');
    });

    it('strips trailing slash from CDN_URL', () => {
      const svc = new StorageService(makeConfig({
        STORAGE_PROVIDER: 's3',
        CDN_URL: 'https://cdn.dhyanastays.com/',
      }));
      expect(svc.buildPublicUrl('listings/user-1/photo.jpg'))
        .toBe('https://cdn.dhyanastays.com/listings/user-1/photo.jpg');
    });

    it('uses S3 virtual-hosted URL format when provider=s3 and no CDN', () => {
      const svc = new StorageService(makeConfig({
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'dhyana-stays-media',
        S3_REGION: 'ap-south-1',
        CDN_URL: '',
      }));
      expect(svc.buildPublicUrl('listings/user-1/photo.jpg'))
        .toBe('https://dhyana-stays-media.s3.ap-south-1.amazonaws.com/listings/user-1/photo.jpg');
    });

    it('uses endpoint/bucket/key format when provider=r2 and no CDN', () => {
      const svc = new StorageService(makeConfig({
        STORAGE_PROVIDER: 'r2',
        S3_ENDPOINT: 'https://abc123.r2.cloudflarestorage.com',
        S3_BUCKET: 'dhyana-stays-media',
        CDN_URL: '',
      }));
      expect(svc.buildPublicUrl('listings/user-1/photo.jpg'))
        .toBe('https://abc123.r2.cloudflarestorage.com/dhyana-stays-media/listings/user-1/photo.jpg');
    });

    it('CDN_URL takes precedence over r2 endpoint', () => {
      const svc = new StorageService(makeConfig({
        STORAGE_PROVIDER: 'r2',
        S3_ENDPOINT: 'https://abc123.r2.cloudflarestorage.com',
        S3_BUCKET: 'dhyana-stays-media',
        CDN_URL: 'https://media.dhyanastays.com',
      }));
      expect(svc.buildPublicUrl('listings/user-1/photo.jpg'))
        .toBe('https://media.dhyanastays.com/listings/user-1/photo.jpg');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // S3 PROVIDER
  // ══════════════════════════════════════════════════════════════════════════

  describe('s3 provider', () => {
    it('getPresignedUploadUrl returns URL with AWS4-HMAC-SHA256 algorithm param', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    });

    it('getPresignedUploadUrl includes access key in credential', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('X-Amz-Credential=AKIATEST123456');
    });

    it('getPresignedUploadUrl includes X-Amz-Signature', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('X-Amz-Signature=');
    });

    it('getPresignedUploadUrl includes correct expiry', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg', 300);

      expect(result.uploadUrl).toContain('X-Amz-Expires=300');
    });

    it('getPresignedUploadUrl uses ap-south-1 region in credential scope', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      // Credential scope is URL-encoded: %2Fap-south-1%2Fs3%2Faws4_request
      expect(result.uploadUrl).toContain('ap-south-1');
    });

    it('getPresignedUploadUrl key has correct folder and .jpg extension', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.key).toMatch(/^listings\/user-1\/.+\.jpg$/);
    });

    it('getPresignedUploadUrl publicUrl uses S3 virtual-hosted format', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.publicUrl).toContain('dhyana-stays-media.s3.ap-south-1.amazonaws.com');
    });

    it('does not call fetch for presigned URL generation', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('deleteObject calls fetch DELETE with SigV4 Authorization header', async () => {
      const svc = new StorageService(makeConfig(S3_CONFIG));
      await svc.deleteObject('listings/user-1/photo.jpg');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('dhyana-stays-media.s3.ap-south-1.amazonaws.com');
      expect(opts.method).toBe('DELETE');
      const authHeader = (opts.headers as Record<string, string>)['Authorization'];
      expect(authHeader).toContain('AWS4-HMAC-SHA256');
      expect(authHeader).toContain('AKIATEST123456');
    });

    it('deleteObject throws when S3 returns non-204 error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Forbidden'),
      } as unknown as Response);
      const svc = new StorageService(makeConfig(S3_CONFIG));
      await expect(svc.deleteObject('listings/user-1/photo.jpg')).rejects.toThrow('S3 delete failed: 403');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // R2 PROVIDER
  // ══════════════════════════════════════════════════════════════════════════

  describe('r2 provider', () => {
    it('getPresignedUploadUrl uses "auto" region in credential scope', async () => {
      const svc = new StorageService(makeConfig(R2_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      // Credential scope contains /auto/s3/aws4_request (URL-encoded)
      expect(result.uploadUrl).toContain('%2Fauto%2Fs3%2Faws4_request');
    });

    it('getPresignedUploadUrl includes R2 access key in credential', async () => {
      const svc = new StorageService(makeConfig(R2_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('X-Amz-Credential=r2-access-key-test');
    });

    it('getPresignedUploadUrl includes X-Amz-Signature', async () => {
      const svc = new StorageService(makeConfig(R2_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('X-Amz-Signature=');
    });

    it('getPresignedUploadUrl uploadUrl points to R2 endpoint', async () => {
      const svc = new StorageService(makeConfig(R2_CONFIG));
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('abc123.r2.cloudflarestorage.com');
    });

    it('deleteObject calls fetch DELETE against R2 endpoint', async () => {
      const svc = new StorageService(makeConfig(R2_CONFIG));
      await svc.deleteObject('listings/user-1/photo.jpg');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('abc123.r2.cloudflarestorage.com');
      expect(opts.method).toBe('DELETE');
      const authHeader = (opts.headers as Record<string, string>)['Authorization'];
      expect(authHeader).toContain('AWS4-HMAC-SHA256');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MIME-TO-EXT MAPPING (via getPresignedUploadUrl with no file extension)
  // ══════════════════════════════════════════════════════════════════════════

  describe('mime-to-ext mapping', () => {
    const cases: Array<[string, string, string]> = [
      ['image/jpeg', 'photo',    '.jpg'],
      ['image/png',  'photo',    '.png'],
      ['image/webp', 'photo',    '.webp'],
      ['image/gif',  'photo',    '.gif'],
      ['application/pdf', 'doc', '.pdf'],
      ['application/octet-stream', 'file', '.bin'], // unknown → .bin
    ];

    it.each(cases)('mimeType=%s → key ends with %s', async (mimeType, filename, expectedExt) => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      const result = await svc.getPresignedUploadUrl('listings/user-1', filename, mimeType);
      expect(result.key).toMatch(new RegExp(`\\${expectedExt}$`));
    });

    it('uses file extension from filename when present (overrides mime mapping)', async () => {
      const svc = new StorageService(makeConfig({ STORAGE_PROVIDER: 'stub' }));
      // filename has .jpg extension — should use that, not derive from mimeType
      const result = await svc.getPresignedUploadUrl('listings/user-1', 'photo.jpg', 'image/png');
      expect(result.key).toMatch(/\.jpg$/);
    });
  });
});
