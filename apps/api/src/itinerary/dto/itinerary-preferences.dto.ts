import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const TRAVEL_STYLES = [
  'budget',
  'balanced',
  'comfort',
  'luxury',
  'backpacking',
] as const;

export const TRIP_PACES = [
  'relaxed',
  'balanced',
  'fast-paced',
] as const;

export const DIETARY_REQUIREMENTS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'ayurvedic',
  'jain',
  'sattvic',
  'raw',
  'non-veg-available',
  'no-preference',
] as const;

export const ACCOMMODATION_PREFERENCES = [
  'villa',
  'cottage',
  'ashram',
  'homestay',
  'resort',
  'farmstay',
  'boutique-hotel',
  'no-preference',
] as const;

export const TRANSPORT_PREFERENCES = [
  'walking',
  'public-transport',
  'cab',
  'self-drive',
  'mixed',
  'no-preference',
] as const;

export const ACTIVITY_INTENSITIES = [
  'light',
  'moderate',
  'active',
] as const;

export class ItineraryPreferencesDto {
  @IsString()
  @MaxLength(120)
  destination!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  travelers!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  interests?: string[];

  /** Maximum trip budget per person, stored in the smallest currency unit. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  budgetMinor?: number;

  @IsOptional()
  @IsString()
  @IsIn(TRAVEL_STYLES)
  travelStyle?: string;

  @IsOptional()
  @IsString()
  @IsIn(TRIP_PACES)
  pace?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(DIETARY_REQUIREMENTS, { each: true })
  dietaryRequirements?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  accessibilityNeeds?: string;

  @IsOptional()
  @IsString()
  @IsIn(ACCOMMODATION_PREFERENCES)
  accommodationPreference?: string;

  @IsOptional()
  @IsString()
  @IsIn(TRANSPORT_PREFERENCES)
  transportPreference?: string;

  @IsOptional()
  @IsString()
  @IsIn(ACTIVITY_INTENSITIES)
  activityIntensity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;
}
