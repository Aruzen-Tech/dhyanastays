import { InfluencerPayoutStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin-only. An influencer can REQUEST a payout but can never move it to
 * APPROVED/PROCESSING/PAID themselves — enforced by keeping this action off
 * the influencer-facing controller entirely.
 */
export class ReviewPayoutDto {
  @IsEnum(InfluencerPayoutStatus)
  status!: InfluencerPayoutStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureReason?: string;
}
