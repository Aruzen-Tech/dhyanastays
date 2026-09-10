import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Send outreach to one contact, a set of selected contacts, or a segment. */
export class SendOutreachDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  segmentId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['EMAIL', 'SMS'], { each: true })
  channels!: string[];

  /** Email subject (ignored for SMS). Supports {{name}} / {{firstName}}. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
