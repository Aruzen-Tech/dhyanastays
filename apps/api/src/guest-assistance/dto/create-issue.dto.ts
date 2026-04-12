import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { IssueCategory, IssueUrgency } from '@prisma/client';

export class CreateIssueDto {
  @IsEnum(IssueCategory)
  category!: IssueCategory;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsEnum(IssueUrgency)
  urgency?: IssueUrgency;

  @IsOptional()
  @IsString()
  @IsUrl()
  photoUrl?: string;
}
