import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const EXPERIENCE_CATEGORIES = [
  'yoga-class',
  'meditation',
  'ayurveda',
  'sound-healing',
  'cooking-class',
  'guided-hike',
  'retreat-day',
  'wellness-workshop',
  'spa-session',
  'cultural-tour',
] as const;

export class CreateExperienceDto {
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  description!: string;

  @IsString()
  @IsIn(EXPERIENCE_CATEGORIES)
  category!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  listingId?: string;

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

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  capacity!: number;

  /** Per-seat price in paise */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priceMinor!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
