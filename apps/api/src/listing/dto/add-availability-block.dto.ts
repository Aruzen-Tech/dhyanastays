import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class AddAvailabilityBlockDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reason!: string;
}
