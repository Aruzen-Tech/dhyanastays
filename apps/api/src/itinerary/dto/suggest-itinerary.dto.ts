import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Request body for `POST /itineraries/suggestions` — returns 2–3 concept
 * cards (theme/title/summary) before the user commits to a full plan.
 * Fields mirror GenerateItineraryDto so the user can move from suggestions
 * → generation without re-entering anything.
 */
export class SuggestItineraryDto {
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

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  budgetMinor?: number;
}
