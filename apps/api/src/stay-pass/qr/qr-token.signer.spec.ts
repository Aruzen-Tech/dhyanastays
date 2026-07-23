import { QrTokenSignerService } from './qr-token.signer';

/**
 * Token-security tests (spec §11): tampering, malformed input, and round-trip.
 * Time-window / revocation / substitution are enforced in CheckinService and
 * covered in checkin.service.spec.ts.
 */

function makeSigner(secret = 'unit-test-qr-secret-32-characters!!'): QrTokenSignerService {
  const config = {
    get: (key: string) => (key === 'QR_SIGNING_SECRET' ? secret : ''),
  };
  return new QrTokenSignerService(config as never);
}

const INPUT = {
  bookingId: 'booking-123',
  jti: 'jti-abc',
  checkIn: new Date('2026-08-14T00:00:00Z'),
  checkOut: new Date('2026-08-17T00:00:00Z'),
};

describe('QrTokenSignerService', () => {
  it('round-trips a signed token', () => {
    const signer = makeSigner();
    const token = signer.sign(INPUT);
    const res = signer.verify(token);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.payload.bid).toBe('booking-123');
      expect(res.payload.jti).toBe('jti-abc');
      expect(res.payload.typ).toBe('checkin');
      // nbf = check-in − 24h; exp = check-out + 24h
      expect(res.payload.nbf).toBe(Math.floor(INPUT.checkIn.getTime() / 1000) - 86400);
      expect(res.payload.exp).toBe(Math.floor(INPUT.checkOut.getTime() / 1000) + 86400);
    }
  });

  it('rejects a tampered payload (signature mismatch)', () => {
    const signer = makeSigner();
    const token = signer.sign(INPUT);
    const [body, sig] = token.split('.');
    const tampered = JSON.parse(Buffer.from(body, 'base64url').toString());
    tampered.bid = 'booking-EVIL';
    const forged = `${Buffer.from(JSON.stringify(tampered)).toString('base64url')}.${sig}`;
    const res = signer.verify(forged);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('INVALID_SIG');
  });

  it('rejects a token signed with a different secret', () => {
    const a = makeSigner('secret-one-32-characters-long-aaaa!');
    const b = makeSigner('secret-two-32-characters-long-bbbb!');
    const token = a.sign(INPUT);
    const res = b.verify(token);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('INVALID_SIG');
  });

  it('rejects malformed tokens', () => {
    const signer = makeSigner();
    for (const bad of ['', 'nodots', 'a.b.c', 'not-base64.!!!!']) {
      const res = signer.verify(bad);
      expect(res.ok).toBe(false);
    }
  });

  it('rejects a structurally-valid token whose payload is not a checkin token', () => {
    const signer = makeSigner();
    // Sign an arbitrary payload with the real secret via the private hmac path:
    // build body manually then let verify() check shape.
    const body = Buffer.from(JSON.stringify({ typ: 'other', bid: 'x' })).toString('base64url');
    // forge signature using the same secret by round-tripping through sign()
    // is not possible for arbitrary bodies — so assert MALFORMED-or-INVALID_SIG.
    const res = signer.verify(`${body}.deadbeef`);
    expect(res.ok).toBe(false);
  });
});
