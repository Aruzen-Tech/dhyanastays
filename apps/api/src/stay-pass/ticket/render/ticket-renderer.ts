import { Resvg } from '@resvg/resvg-js';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { ThemeBundle } from '../../theme/themes.registry';

/**
 * Deterministic Stay Pass renderer — one master SVG template, every format
 * derived from it (spec §3.1). Pure functions of a frozen RenderContext:
 * identical input → identical bytes, which makes the pipeline idempotent and
 * golden-file-testable.
 *
 * Formats:
 *   og     1200×630  — Open Graph / link unfurl (share-safe)
 *   story  1080×1920 — story/status share (share-safe)
 *   hero   1200×480  — email hero (functional: shows ref, no QR)
 *   full   1200×630  — booking-page ticket WITH QR (functional)
 *   pdf    A5 landscape voucher (functional, embeds the full PNG)
 *
 * Privacy rule (spec §3.3): share-safe variants carry no QR, no booking ref,
 * and first-name-only.
 */

export const TEMPLATE_VERSION = 1;

export interface RenderContext {
  ticketId: string;
  templateVersion: number;
  theme: ThemeBundle;
  edition: { id: string; serial: number; maxIssue: number | null } | null;
  booking: {
    refShort: string;
    propertyName: string;
    locationLine: string;
    guestDisplayName: string; // full display name (functional variants)
    guestFirstName: string; // share-safe variants
    checkInDate: string; // '2026-08-14'
    checkInTime: string; // '14:00'
    checkOutDate: string;
    checkOutTime: string;
    nights: number;
    guests: number;
    curatedBadge: boolean;
  };
  qrToken: string; // signed token (functional variants only)
}

export interface RenderedAssets {
  og: Buffer;
  story: Buffer;
  hero: Buffer;
  full: Buffer;
  pdf: Buffer;
}

// ── SVG helpers ──────────────────────────────────────────────────────────────

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Subtle repeated motif dots — deterministic decorative texture. */
function patternDots(width: number, height: number, color: string): string {
  const cells: string[] = [];
  for (let y = 40; y < height; y += 120) {
    for (let x = 40; x < width; x += 120) {
      cells.push(`<circle cx="${x}" cy="${y}" r="3" fill="${color}" fill-opacity="0.08"/>`);
    }
  }
  return cells.join('');
}

async function qrSvgGroup(token: string, x: number, y: number, size: number): Promise<string> {
  // qrcode's svg output is a full <svg>; extract the path and wrap in a <g>.
  const raw = await QRCode.toString(token, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
  });
  const viewBox = raw.match(/viewBox="0 0 (\d+) (\d+)"/);
  const dim = viewBox ? Number(viewBox[1]) : 33;
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    // qrcode emits a white background rect first — keep it (quiet zone).
    .trim();
  const scale = size / dim;
  return `<g transform="translate(${x},${y}) scale(${scale})">${inner}</g>`;
}

// ── Master template ──────────────────────────────────────────────────────────

interface Variant {
  width: number;
  height: number;
  shareSafe: boolean; // strips QR + ref + surname
  withQr: boolean;
}

async function masterSvg(ctx: RenderContext, v: Variant): Promise<string> {
  const t = ctx.theme.tokens;
  const W = v.width;
  const H = v.height;
  const pad = Math.round(W * 0.05);
  const name = v.shareSafe ? ctx.booking.guestFirstName : ctx.booking.guestDisplayName;

  const headerH = Math.round(H * 0.42);
  const isPortrait = H > W;
  const titleSize = Math.round(W / (isPortrait ? 16 : 26));
  const bodySize = Math.round(W / (isPortrait ? 30 : 46));
  const smallSize = Math.round(bodySize * 0.8);

  const qrSize = Math.round(Math.min(W, H) * 0.22);
  const qr = v.withQr
    ? await qrSvgGroup(ctx.qrToken, W - pad - qrSize, H - pad - qrSize, qrSize)
    : '';

  const editionLine = ctx.edition
    ? `<text x="${pad}" y="${H - pad - smallSize * 1.6}" font-family="sans-serif" font-size="${smallSize}" fill="${t.palette.text_mid}">Pass ${ctx.edition.serial}${ctx.edition.maxIssue ? ` of ${ctx.edition.maxIssue}` : ''} · ${esc(ctx.edition.id.replace(/_/g, ' '))} edition</text>`
    : '';

  const curated = ctx.booking.curatedBadge
    ? `<g><rect x="${W - pad - 190}" y="${pad}" rx="14" width="190" height="34" fill="${t.palette.on_dark}" fill-opacity="0.18"/><text x="${W - pad - 95}" y="${pad + 23}" text-anchor="middle" font-family="sans-serif" font-size="${smallSize}" fill="${t.palette.on_dark}">CURATED STAY</text></g>`
    : '';

  const refLine = v.shareSafe
    ? ''
    : `<text x="${pad}" y="${headerH - Math.round(pad * 0.55)}" font-family="monospace" font-size="${smallSize}" fill="${t.palette.on_dark}" fill-opacity="0.85">${esc(ctx.booking.refShort)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${t.palette.surface}"/>
  ${patternDots(W, H, t.palette.primary)}
  <rect width="${W}" height="${headerH}" fill="${t.palette.primary}"/>
  ${curated}
  <text x="${pad}" y="${Math.round(headerH * 0.34)}" font-family="sans-serif" font-size="${smallSize}" letter-spacing="4" fill="${t.palette.on_dark}" fill-opacity="0.85">DHYANA STAYS · STAY PASS</text>
  <text x="${pad}" y="${Math.round(headerH * 0.56)}" font-family="serif" font-size="${titleSize}" fill="${t.palette.on_dark}">${esc(ctx.booking.propertyName)}</text>
  <text x="${pad}" y="${Math.round(headerH * 0.56) + Math.round(titleSize * 1.1)}" font-family="sans-serif" font-size="${bodySize}" fill="${t.palette.on_dark}" fill-opacity="0.9">${esc(ctx.booking.locationLine)}</text>
  ${refLine}
  <text x="${pad}" y="${headerH + pad + bodySize}" font-family="sans-serif" font-size="${bodySize}" fill="${t.palette.text_dark}">${esc(name)}</text>
  <text x="${pad}" y="${headerH + pad + bodySize * 2.5}" font-family="sans-serif" font-size="${bodySize}" fill="${t.palette.text_dark}">
    <tspan font-weight="bold">${fmtDate(ctx.booking.checkInDate)}</tspan> ${esc(ctx.booking.checkInTime)} → <tspan font-weight="bold">${fmtDate(ctx.booking.checkOutDate)}</tspan> ${esc(ctx.booking.checkOutTime)}
  </text>
  <text x="${pad}" y="${headerH + pad + bodySize * 4}" font-family="sans-serif" font-size="${bodySize}" fill="${t.palette.text_mid}">${ctx.booking.nights} night${ctx.booking.nights === 1 ? '' : 's'} · ${ctx.booking.guests} guest${ctx.booking.guests === 1 ? '' : 's'}</text>
  <text x="${pad}" y="${H - pad}" font-family="serif" font-size="${bodySize}" font-style="italic" fill="${t.palette.text_mid}">${esc(t.mood_line)}</text>
  ${editionLine}
  ${qr}
</svg>`;
}

// ── Format derivations ───────────────────────────────────────────────────────

function svgToPng(svg: string): Buffer {
  const r = new Resvg(svg, {
    // System fonts: dev machines have them; the Docker image installs Noto
    // families (incl. Tamil/Devanagari) — fonts are baked, never fetched.
    font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
  });
  return Buffer.from(r.render().asPng());
}

async function voucherPdf(fullPng: Buffer, ctx: RenderContext): Promise<Buffer> {
  // A5 landscape: 595 × 420 pt. Embed the full ticket PNG + a footer note.
  const doc = await PDFDocument.create();
  doc.setTitle(`Dhyana Stays — Stay Pass ${ctx.booking.refShort}`);
  doc.setCreator('Dhyana Stays');
  const page = doc.addPage([595, 420]);
  const png = await doc.embedPng(new Uint8Array(fullPng));
  const margin = 24;
  const maxW = 595 - margin * 2;
  const maxH = 420 - margin * 2 - 20;
  const scale = Math.min(maxW / png.width, maxH / png.height);
  const w = png.width * scale;
  const h = png.height * scale;
  page.drawImage(png, {
    x: (595 - w) / 2,
    y: 420 - margin - h,
    width: w,
    height: h,
  });
  page.drawText('Present the QR at check-in · This voucher accompanies your GST invoice', {
    x: margin,
    y: margin / 2 + 4,
    size: 8,
  });
  return Buffer.from(await doc.save());
}

/** Render every output format from the one master template. */
export async function renderAll(ctx: RenderContext): Promise<RenderedAssets> {
  const [ogSvg, storySvg, heroSvg, fullSvg] = await Promise.all([
    masterSvg(ctx, { width: 1200, height: 630, shareSafe: true, withQr: false }),
    masterSvg(ctx, { width: 1080, height: 1920, shareSafe: true, withQr: false }),
    masterSvg(ctx, { width: 1200, height: 480, shareSafe: false, withQr: false }),
    masterSvg(ctx, { width: 1200, height: 630, shareSafe: false, withQr: true }),
  ]);
  const og = svgToPng(ogSvg);
  const story = svgToPng(storySvg);
  const hero = svgToPng(heroSvg);
  const full = svgToPng(fullSvg);
  const pdf = await voucherPdf(full, ctx);
  return { og, story, hero, full, pdf };
}

/** Exported for golden-file tests — the deterministic master SVG. */
export const __testing = { masterSvg };
