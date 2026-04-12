import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreparationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  packingList?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  whatToExpect?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  dailySchedule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dietaryInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  arrivalInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalNotes?: string;
}
