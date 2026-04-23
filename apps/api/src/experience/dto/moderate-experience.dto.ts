import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateExperienceDto {
  @IsIn(['APPROVED', 'REJECTED'])
  action!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
