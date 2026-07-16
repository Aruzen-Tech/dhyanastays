import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AckIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ResolveIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  falseAlarm?: string;
}
