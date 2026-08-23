import { InfluencerTrackingLinkType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTrackingLinkDto {
  @IsEnum(InfluencerTrackingLinkType)
  type!: InfluencerTrackingLinkType;

  @IsOptional()
  @IsString()
  targetListingId?: string;

  @IsOptional()
  @IsString()
  targetExperienceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  destination?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;
}
