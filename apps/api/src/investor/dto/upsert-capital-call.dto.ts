import { CapitalCallStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateCapitalCallDto {
  @IsString()
  listingId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(1, 240)
  reason!: string;

  @IsISO8601()
  dueAt!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class UpdateCapitalCallDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amountMinor?: number;

  @IsOptional()
  @IsString()
  @Length(1, 240)
  reason?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsEnum(CapitalCallStatus)
  status?: CapitalCallStatus;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}
