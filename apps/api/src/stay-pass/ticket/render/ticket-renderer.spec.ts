import {
  renderAll,
  RenderContext,
  TEMPLATE_VERSION,
  __testing,
} from './ticket-renderer';
import { DEFAULT_THEME } from '../../theme/themes.registry';

/**
 * Renderer tests (spec §11):
 *  - determinism: identical context → byte-identical SVG (golden-file property)
 *  - privacy rule: share-safe variants carry no QR, no booking ref, no surname
 *  - all formats produce non-trivial output (PNG magic bytes, PDF header)
 */

const CTX: RenderContext = {
  ticketId: 'ticket-1',
  templateVersion: TEMPLATE_VERSION,
  theme: DEFAULT_THEME,
  edition: null,
  booking: {
    refShort: 'DS-8F2K91AB',
    propertyName: 'Canopy villa at Sadhana forest edge',
    locationLine: 'Auroville, Tamil Nadu',
    guestDisplayName: 'Ananya Ramachandran',
    guestFirstName: 'Ananya',
    checkInDate: '2026-08-14',
    checkInTime: '14:00',
    checkOutDate: '2026-08-17',
    checkOutTime: '11:00',
    nights: 3,
    guests: 2,
    curatedBadge: true,
  },
  qrToken: 'eyJib2R5IjoidGVzdCJ9.c2lnbmF0dXJl',
};

describe('ticket renderer', () => {
  it('is deterministic — identical context yields byte-identical master SVG', async () => {
    const v = { width: 1200, height: 630, shareSafe: false, withQr: true };
    const a = await __testing.masterSvg(CTX, v);
    const b = await __testing.masterSvg(CTX, v);
    expect(a).toBe(b);
  });

  it('share-safe variant strips QR, booking ref, and surname', async () => {
    const svg = await __testing.masterSvg(CTX, {
      width: 1200,
      height: 630,
      shareSafe: true,
      withQr: false,
    });
    expect(svg).not.toContain('DS-8F2K91AB'); // no booking ref
    expect(svg).not.toContain('Ramachandran'); // first-name only
    expect(svg).toContain('Ananya');
    expect(svg).not.toContain(CTX.qrToken); // no QR payload at all
  });

  it('functional variant carries ref, full name and QR', async () => {
    const svg = await __testing.masterSvg(CTX, {
      width: 1200,
      height: 630,
      shareSafe: false,
      withQr: true,
    });
    expect(svg).toContain('DS-8F2K91AB');
    expect(svg).toContain('Ananya Ramachandran');
    // QR is rendered as vector paths inside a <g>, not the raw token string
    expect(svg).toContain('<g transform=');
    expect(svg).not.toContain(CTX.qrToken);
  });

  it('escapes markup-hostile strings in guest/property names', async () => {
    const hostile: RenderContext = {
      ...CTX,
      booking: {
        ...CTX.booking,
        propertyName: 'Villa <script>alert(1)</script> & spa',
        guestDisplayName: 'A "quoted" <name>',
        guestFirstName: 'A',
      },
    };
    const svg = await __testing.masterSvg(hostile, {
      width: 1200,
      height: 630,
      shareSafe: false,
      withQr: false,
    });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&amp; spa');
  });

  it('renders every format with valid magic bytes', async () => {
    const assets = await renderAll(CTX);
    // PNG signature
    for (const buf of [assets.og, assets.story, assets.hero, assets.full]) {
      expect(buf.length).toBeGreaterThan(1000);
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    }
    // PDF header
    expect(assets.pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(assets.pdf.length).toBeGreaterThan(1000);
  }, 30000);
});
