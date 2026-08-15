import { InfluencerContentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateContentDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsEnum(InfluencerContentType)
  type!: InfluencerContentType;

  /**
   * Content is represented as a URL/link only (Instagram post link, YouTube
   * link, blog link, hosted photo album link, etc.) — the platform never
   * stores raw video/photo footage for influencer content.
   */
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;
}
