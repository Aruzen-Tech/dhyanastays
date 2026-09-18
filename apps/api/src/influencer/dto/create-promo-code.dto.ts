import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Admin-only — there is no influencer-facing "create promo code" endpoint.
 * Per the docx security rule, influencers must never be able to create
 * unrestricted promotional codes; codes are either system-generated on
 * verification approval (InfluencerService.approveVerification) or created
 * here by an admin for a specific campaign.
 */
export class CreatePromoCodeDto {
  @IsString()
  influencerId!: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  discountBps?: number;

  @IsOptional()
  @IsDateString()
  @Type(() => String)
  validUntil?: string;
}
