import { InfluencerCommissionRuleType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PerformanceTierDto {
  @IsInt()
  @Min(0)
  minBookings!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxBookings?: number;

  @IsInt()
  @Min(0)
  @Max(10_000)
  percentageBps!: number;
}

/**
 * Admin-only — influencers may view the rule that applies to them but can
 * never create or modify one (docx §13, permission boundary).
 */
export class CreateCommissionRuleDto {
  @IsEnum(InfluencerCommissionRuleType)
  type!: InfluencerCommissionRuleType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  percentageBps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fixedAmountMinor?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PerformanceTierDto)
  tierConfig?: PerformanceTierDto[];

  @IsOptional()
  @IsString()
  campaignId?: string;
}
