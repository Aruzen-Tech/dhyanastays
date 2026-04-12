import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckInDto {
  @IsString()
  @MaxLength(200)
  confirmedName!: string;

  @IsString()
  @MaxLength(50)
  arrivalTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialNotes?: string;
}
