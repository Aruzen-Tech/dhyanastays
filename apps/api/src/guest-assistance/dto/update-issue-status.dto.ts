import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IssueStatus } from '@prisma/client';

export class UpdateIssueStatusDto {
  @IsEnum(IssueStatus)
  status!: IssueStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hostNotes?: string;
}
