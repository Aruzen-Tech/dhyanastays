import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class AddMediaDto {
  @IsUrl()
  url!: string;

  @IsString()
  mediaType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
