import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ManualSectionDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;
}

export class UpdateManualDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualSectionDto)
  sections!: ManualSectionDto[];
}
