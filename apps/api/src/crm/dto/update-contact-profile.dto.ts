import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Editable CRM profile fields on a contact. */
export class UpdateContactProfileDto {
  /** Assigned account owner (staff user id). Empty string clears it. */
  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsOptional()
  @IsBoolean()
  doNotContact?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  leadScore?: number;
}
