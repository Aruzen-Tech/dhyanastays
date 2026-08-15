import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Create a customer-level CRM tag. */
export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;
}
