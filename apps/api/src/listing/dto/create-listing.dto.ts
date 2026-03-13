import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateListingDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
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
}
