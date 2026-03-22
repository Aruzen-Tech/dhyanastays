import { IsDateString, IsInt, Min } from 'class-validator';

export class AddSeasonalRateDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  /** Nightly rate in paise */
  @IsInt()
  @Min(100)
  nightlyRate!: number;
}
