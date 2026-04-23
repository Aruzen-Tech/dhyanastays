import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class BookExperienceDto {
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  seats!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
