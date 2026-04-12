import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_HTML: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
  allowedAttributes: {},
};

export class CreateListingDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value, ALLOWED_HTML) : value,
  )
  description!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  /** Base nightly rate in paise (e.g. 500000 = ₹5,000). Min ₹1. */
  @IsInt()
  @Min(100)
  baseNightlyRate!: number;

  /** Maximum number of guests allowed. */
  @IsInt()
  @Min(1)
  @Max(50)
  maxGuests!: number;

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
