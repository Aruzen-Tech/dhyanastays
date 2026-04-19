import { ServiceType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateServiceProviderDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(ServiceType)
  kind!: ServiceType;

  @IsString()
  ownerUserId!: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
