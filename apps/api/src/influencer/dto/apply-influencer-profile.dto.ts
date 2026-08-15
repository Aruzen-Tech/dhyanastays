import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const INFLUENCER_CONTENT_CATEGORIES = [
  'Travel',
  'Architecture',
  'Lifestyle',
  'Adventure',
  'Wellness',
  'Family Travel',
  'Photography',
  'Sustainable Travel',
] as const;

export class ApplyInfluencerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  creatorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  /** { instagram?: string, youtube?: string, ... } — free-form, validated as an object only. */
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  contentCategories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsObject()
  audienceLocation?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  audienceSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  payoutAccountRef?: string;
}
