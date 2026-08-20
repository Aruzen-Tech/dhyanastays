import { InfluencerCampaignApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewApplicationDto {
  @IsEnum(InfluencerCampaignApplicationStatus)
  status!: InfluencerCampaignApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNotes?: string;
}
