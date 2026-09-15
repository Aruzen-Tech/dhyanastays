import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Personal information a user may change about themselves.
 *
 * Email is deliberately absent: it is the login identity, so changing it needs
 * a verification round-trip rather than a silent write. It is returned for
 * display and marked read-only in the UI.
 */
export class UpdateAccountProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  /** Same rule as signup: 10-digit Indian mobile or E.164. */
  @IsOptional()
  @Transform(trim)
  @Matches(/^(\+?[1-9]\d{7,14}|[6-9]\d{9})$/, {
    message: 'phone must be a 10-digit Indian mobile or an E.164 number',
  })
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsUrl({ require_tld: false })
  avatarUrl?: string;
}
