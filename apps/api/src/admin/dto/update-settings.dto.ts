import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class SettingUpdate {
  @IsString()
  key!: string;
  value: unknown;
}

export class UpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingUpdate)
  updates!: SettingUpdate[];
}
