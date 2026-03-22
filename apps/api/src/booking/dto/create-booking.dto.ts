import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum PaymentPlanDto {
  FULL = 'FULL',
  DEPOSIT_50 = 'DEPOSIT_50',
}

export class GuestDetailsDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  estimatedArrival?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}

export class CreateBookingDto {
  /** Hold ID (CUID from Prisma — not a UUID) */
  @IsString()
  holdId!: string;

  @IsEnum(PaymentPlanDto)
  plan!: PaymentPlanDto;

  /**
   * Client-generated idempotency key (UUID v4).
   * Re-submitting the same key returns the existing booking.
   */
  @IsString()
  idempotencyKey!: string;

  @ValidateNested()
  @Type(() => GuestDetailsDto)
  guestDetails!: GuestDetailsDto;
}
