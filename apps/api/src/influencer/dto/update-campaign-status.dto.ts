import { InfluencerCampaignStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCampaignStatusDto {
  @IsEnum(InfluencerCampaignStatus)
  status!: InfluencerCampaignStatus;
}
