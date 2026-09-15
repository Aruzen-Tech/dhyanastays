import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const HOST_ID_TYPES = ['PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID'] as const;

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/;
const PIN_RE = /^[1-9][0-9]{5}$/;

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * The host application. Submitting always returns the host to PENDING review —
 * a changed legal identity or address must be re-checked before they can be
 * treated as verified.
 */
export class SubmitHostProfileDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  legalName!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  businessName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  about?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  // ── Address ──
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  addressLine1!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state!: string;

  @Transform(upper)
  @Matches(PIN_RE, { message: 'postalCode must be a valid 6-digit Indian PIN code' })
  postalCode!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  country?: string;

  // ── Tax identity ──
  @Transform(upper)
  @Matches(PAN_RE, { message: 'pan must be a valid PAN (e.g. ABCDE1234F)' })
  pan!: string;

  /** Only some hosts are GST-registered. */
  @IsOptional()
  @Transform(upper)
  @Matches(GSTIN_RE, { message: 'gstin must be a valid 15-character GSTIN' })
  gstin?: string;

  // ── Photo ID ──
  @IsIn(HOST_ID_TYPES)
  idType!: string;

  @Transform(upper)
  @IsString()
  @MinLength(4)
  @MaxLength(24)
  idNumber!: string;

  /** Storage URL of the uploaded document, from the normal presign flow. */
  @IsOptional()
  @IsUrl({ require_tld: false })
  idDocumentUrl?: string;
}

/** Staff decision on a host application. */
export class ReviewHostDto {
  /** Required when rejecting, so the host knows what to fix. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  note?: string;
}
