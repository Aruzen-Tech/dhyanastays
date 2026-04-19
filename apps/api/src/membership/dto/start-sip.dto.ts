import { IsInt, Max, Min } from 'class-validator';

export class StartSipDto {
  @IsInt()
  @Min(50000)
  monthlyMinor!: number;

  @IsInt()
  @Min(1)
  @Max(28)
  anchorDay!: number;
}
