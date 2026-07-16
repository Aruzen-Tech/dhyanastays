import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewAddOnDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}
