import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';

/** Dev-only fallback. Production is gated by env.validation.ts. */
const DEV_KEY = 'dev-payout-encryption-key-min-32-chars!!';
const VERSION = 'v1';

/**
 * Encrypts host payout identifiers (bank account number, PAN) at rest and
 * derives non-reversible lookup fingerprints.
 *
 * Two things matter here:
 *
 * 1. **AES-256-GCM, not plain AES** — GCM is authenticated, so a tampered
 *    ciphertext fails to decrypt rather than silently yielding garbage that we
 *    might then pay money to.
 * 2. **Fingerprints are a KEYED HMAC, never a bare SHA-256.** Indian account
 *    numbers and PANs are low-entropy and follow known formats, so an unkeyed
 *    digest of the whole table could be brute-forced offline. Keying it means a
 *    database leak alone doesn't reveal the identifiers.
 *
 * Encryption and MAC use separate subkeys derived from the master secret, so
 * the same bytes are never used for two purposes.
 */
@Injectable()
export class PayoutCryptoService {
  private readonly logger = new Logger(PayoutCryptoService.name);
  private readonly encKey: Buffer;
  private readonly macKey: Buffer;

  constructor(config: ConfigService) {
    const master = config.get<string>('PAYOUT_ENCRYPTION_KEY', '') || DEV_KEY;
    if (master === DEV_KEY) {
      this.logger.warn(
        'PAYOUT_ENCRYPTION_KEY not set — using the dev fallback. Host payout ' +
          'identifiers are NOT securely encrypted. Set it before any real data.',
      );
    }
    // Domain-separated subkeys so the encryption key and the MAC key differ.
    this.encKey = createHash('sha256').update(`${master}|enc`).digest();
    this.macKey = createHash('sha256').update(`${master}|mac`).digest();
  }

  /** Encrypt a sensitive identifier. Returns `v1.<iv>.<tag>.<ciphertext>` (base64url parts). */
  encrypt(plain: string): string {
    const iv = randomBytes(12); // 96-bit nonce, the GCM standard
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, b64(iv), b64(tag), b64(ct)].join('.');
  }

  /**
   * Decrypt a blob produced by `encrypt`. Throws if the payload was tampered
   * with or the key changed — callers should treat a throw as "unusable".
   */
  decrypt(blob: string): string {
    const [version, ivB64, tagB64, ctB64] = blob.split('.');
    if (version !== VERSION || !ivB64 || !tagB64 || !ctB64) {
      throw new Error('Unrecognised payout ciphertext format');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, unb64(ivB64));
    decipher.setAuthTag(unb64(tagB64));
    return Buffer.concat([
      decipher.update(unb64(ctB64)),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Keyed, non-reversible fingerprint of a payout destination — used to spot
   * the same bank account or VPA reused across hosts without storing plaintext.
   */
  fingerprint(...parts: string[]): string {
    const normalised = parts
      .map((p) => p.replace(/\s+/g, '').toUpperCase())
      .join('|');
    return createHmac('sha256', this.macKey).update(normalised).digest('hex');
  }

  /** Last 4 characters, for display. Returns '' for anything shorter. */
  last4(value: string): string {
    const clean = value.replace(/\s+/g, '');
    return clean.length >= 4 ? clean.slice(-4) : '';
  }
}

const b64 = (b: Buffer) => b.toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url');
