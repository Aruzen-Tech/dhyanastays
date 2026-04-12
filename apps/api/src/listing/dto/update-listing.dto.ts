import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_HTML: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
  allowedAttributes: {},
};

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value, ALLOWED_HTML) : value,
  )
  description?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  /** Base nightly rate in paise (min ₹1 = 100 paise) */
  @IsOptional()
  @IsInt()
  @Min(100)
  baseNightlyRate?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxGuests?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minNights?: number;

  /** Cleaning fee in paise */
  @IsOptional()
  @IsInt()
  @Min(0)
  cleaningFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
