import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const PAYOUT_METHODS = ['BANK_ACCOUNT', 'UPI'] as const;

/** Indian formats — enforced here so bad data never reaches the PA. */
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ACCOUNT_RE = /^[0-9]{6,18}$/;
const VPA_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/;

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value;
const strip = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '') : value;

/**
 * Host submits (or re-submits) their payout destination. Submitting always
 * resets the account to SUBMITTED — a changed bank account must be re-verified
 * before any further payout.
 */
export class SubmitPayoutAccountDto {
  @IsIn(PAYOUT_METHODS)
  method!: string;

  /** Must match the bank account holder / PAN holder. */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  legalName!: string;

  // ── Bank rail (required when method = BANK_ACCOUNT) ──
  @ValidateIf((o: SubmitPayoutAccountDto) => o.method === 'BANK_ACCOUNT')
  @Transform(strip)
  @Matches(ACCOUNT_RE, { message: 'accountNumber must be 6–18 digits' })
  accountNumber?: string;

  @ValidateIf((o: SubmitPayoutAccountDto) => o.method === 'BANK_ACCOUNT')
  @Transform(upper)
  @Matches(IFSC_RE, { message: 'ifsc must be a valid IFSC (e.g. HDFC0001234)' })
  ifsc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  // ── UPI rail (required when method = UPI) ──
  @ValidateIf((o: SubmitPayoutAccountDto) => o.method === 'UPI')
  @Transform(strip)
  @Matches(VPA_RE, { message: 'upiVpa must be a valid UPI ID (e.g. name@bank)' })
  upiVpa?: string;

  // ── Tax identity (always required — needed for TDS/TCS reporting) ──
  @Transform(upper)
  @Matches(PAN_RE, { message: 'pan must be a valid PAN (e.g. ABCDE1234F)' })
  pan!: string;
}

/** Admin decision on a submitted account. */
export class VerifyPayoutAccountDto {
  @IsIn(['VERIFIED', 'REJECTED'])
  status!: string;

  /** Required when rejecting so the host is told what to fix. */
  @ValidateIf((o: VerifyPayoutAccountDto) => o.status === 'REJECTED')
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  rejectionReason?: string;
}

/** Admin: place or lift an administrative payout hold on a host. */
export class SetPayoutHoldDto {
  /** Empty/omitted lifts the hold. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
