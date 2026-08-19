import {
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const AD_FREQUENCIES = ['once', 'session', 'daily', 'always'] as const;
export const AD_PLACEMENTS = ['explore_billboard'] as const;

export class CreateAdvertisementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  ctaHref?: string;

  @IsOptional()
  @IsIn(AD_PLACEMENTS)
  placement?: string;

  @IsOptional()
  @IsIn(AD_FREQUENCIES)
  frequency?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** ISO or datetime-local string; empty clears (no window). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  startsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  endsAt?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}

export class UpdateAdvertisementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  ctaHref?: string;

  @IsOptional()
  @IsIn(AD_PLACEMENTS)
  placement?: string;

  @IsOptional()
  @IsIn(AD_FREQUENCIES)
  frequency?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  startsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  endsAt?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}
