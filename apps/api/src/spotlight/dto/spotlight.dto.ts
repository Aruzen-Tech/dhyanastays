import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddSpotlightDto {
  @IsString()
  @MinLength(1)
  listingId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;
}

export class UpdateSpotlightDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderSpotlightDto {
  /** Spotlight row ids in the desired display order (index becomes sortOrder). */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}
