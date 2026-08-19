import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class AddMediaDto {
  // require_tld:false so local/stub URLs (http://localhost:3001/…) validate too.
  @IsUrl({ require_tld: false })
  url!: string;

  @IsString()
  mediaType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
