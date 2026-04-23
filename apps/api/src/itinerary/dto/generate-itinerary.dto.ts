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

export class GenerateItineraryDto {
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

  @IsOptional()
  @IsString()
  listingId?: string;
}
