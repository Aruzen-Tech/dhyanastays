import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckOutDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  conditionNotes?: string;
}
