import { Type } from 'class-transformer';
import { InfluencerContentType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(8000)
  brief!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  destination?: string;

  @IsOptional()
  @IsString()
  targetListingId?: string;

  @IsOptional()
  @IsString()
  targetExperienceId?: string;

  /** { discountBps?, freebies?, ... } — shape intentionally open, admin-authored. */
  @IsOptional()
  @IsObject()
  promotionalOffer?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsEnum(InfluencerContentType, { each: true })
  requiredContentTypes?: InfluencerContentType[];

  @IsOptional()
  @IsDateString()
  @Type(() => String)
  deadline?: string;
}
