import { AddOnScope, CancellationTier } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAddOnDto {
  @IsString()
  providerId!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  /** Price in paise (minor units) */
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @IsOptional()
  @IsEnum(CancellationTier)
  cancellationTier?: CancellationTier;

  @IsOptional()
  @IsInt()
  @Min(0)
  minLeadHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxPerBooking?: number;

  @IsOptional()
  @IsEnum(AddOnScope)
  scope?: AddOnScope;

  @IsOptional()
  @IsString()
  clusterId?: string;

  @IsOptional()
  @IsString()
  listingId?: string;
}
