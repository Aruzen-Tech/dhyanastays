import { PayoutCryptoService } from './payout-crypto.service';

const configWith = (key: string) =>
  ({ get: (_k: string, d?: string) => key || d }) as never;

describe('PayoutCryptoService', () => {
  const KEY = 'test-payout-key-that-is-long-enough-32';
  const svc = new PayoutCryptoService(configWith(KEY));

  it('round-trips an account number', () => {
    const blob = svc.encrypt('123456789012');
    expect(blob).not.toContain('123456789012');
    expect(svc.decrypt(blob)).toBe('123456789012');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(svc.encrypt('ABCDE1234F')).not.toBe(svc.encrypt('ABCDE1234F'));
  });

  it('rejects tampered ciphertext instead of returning garbage', () => {
    const [v, iv, tag, ct] = svc.encrypt('123456789012').split('.');
    // Flip a byte in the ciphertext; GCM's auth tag must catch it.
    const flipped = Buffer.from(ct, 'base64url');
    flipped[0] ^= 0xff;
    const tampered = [v, iv, tag, flipped.toString('base64url')].join('.');
    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it('rejects an unrecognised format', () => {
    expect(() => svc.decrypt('not-a-blob')).toThrow(/Unrecognised/);
  });

  it('fingerprints deterministically and ignores case/spacing', () => {
    const a = svc.fingerprint('BANK', '1234 5678 9012', 'hdfc0001234');
    const b = svc.fingerprint('BANK', '123456789012', 'HDFC0001234');
    expect(a).toBe(b);
  });

  it('keys the fingerprint — a different secret yields a different digest', () => {
    const other = new PayoutCryptoService(configWith('a-completely-different-secret-key-32!'));
    expect(svc.fingerprint('BANK', '123456789012')).not.toBe(
      other.fingerprint('BANK', '123456789012'),
    );
  });

  it('masks to the last 4', () => {
    expect(svc.last4('123456789012')).toBe('9012');
    expect(svc.last4('ABCDE1234F')).toBe('234F');
    expect(svc.last4('12')).toBe('');
  });
});
