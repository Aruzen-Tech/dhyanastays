import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
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
}
