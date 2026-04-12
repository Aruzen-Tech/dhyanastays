import { PriceSnapshotSignerService } from './price-snapshot-signer.service';

function makeService(secret = 'test-secret-that-is-at-least-32-chars!') {
  const config = { get: jest.fn().mockReturnValue(secret) };
  return new PriceSnapshotSignerService(config as never);
}

const sampleSnapshot: Record<string, unknown> = {
  listingId: 'lst_1',
  checkIn: '2026-04-01',
  checkOut: '2026-04-04',
  nights: 3,
  guests: 2,
  subtotal: 1500000,
  cleaningFee: 100000,
  platformFee: 160000,
  total: 1760000,
  depositAmount: 880000,
  balanceAmount: 880000,
  currency: 'INR',
  snapshotAt: '2026-03-25T10:00:00.000Z',
};

describe('PriceSnapshotSignerService', () => {
  it('sign → verify round-trip succeeds', () => {
    const signer = makeService();
    const hmac = signer.sign(sampleSnapshot);
    expect(signer.verify(sampleSnapshot, hmac)).toBe(true);
  });

  it('detects tampered total', () => {
    const signer = makeService();
    const hmac = signer.sign(sampleSnapshot);
    const tampered = { ...sampleSnapshot, total: 999999 };
    expect(signer.verify(tampered, hmac)).toBe(false);
  });

  it('detects tampered subtotal', () => {
    const signer = makeService();
    const hmac = signer.sign(sampleSnapshot);
    const tampered = { ...sampleSnapshot, subtotal: 0 };
    expect(signer.verify(tampered, hmac)).toBe(false);
  });

  it('rejects wrong hmac string', () => {
    const signer = makeService();
    expect(signer.verify(sampleSnapshot, 'wrong-hmac-value-of-same-length-xxxxxxxxx')).toBe(false);
  });

  it('different secrets produce different signatures', () => {
    const signer1 = makeService('secret-one-must-be-at-least-32-chars!');
    const signer2 = makeService('secret-two-must-be-at-least-32-chars!');
    const hmac1 = signer1.sign(sampleSnapshot);
    const hmac2 = signer2.sign(sampleSnapshot);
    expect(hmac1).not.toBe(hmac2);
  });

  it('produces deterministic signatures', () => {
    const signer = makeService();
    const hmac1 = signer.sign(sampleSnapshot);
    const hmac2 = signer.sign(sampleSnapshot);
    expect(hmac1).toBe(hmac2);
  });
});
