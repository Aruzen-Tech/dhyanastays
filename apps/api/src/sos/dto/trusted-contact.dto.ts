import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertTrustedContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Matches(/^\+?[0-9\s-]{8,20}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @IsString()
  @MaxLength(50)
  relation!: string;

  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}
