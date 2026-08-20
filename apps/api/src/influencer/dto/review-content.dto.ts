import { InfluencerContentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin-only. An influencer can never move their own content to REVIEW/
 * APPROVED/PUBLISHED — enforced by keeping this DTO/action off the
 * influencer-facing controller entirely, not just by a role check here.
 */
export class ReviewContentDto {
  @IsEnum(InfluencerContentStatus)
  status!: InfluencerContentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  revisionNotes?: string;
}
