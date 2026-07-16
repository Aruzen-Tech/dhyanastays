import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum PaymentPlanDto {
  FULL = 'FULL',
  DEPOSIT_50 = 'DEPOSIT_50',
  PAY_LATER = 'PAY_LATER',
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

  /** Required when plan = PAY_LATER. Allowed: 3, 6, 12. */
  @ValidateIf((o: CreateBookingDto) => o.plan === PaymentPlanDto.PAY_LATER)
  @IsInt()
  @IsIn([3, 6, 12])
  payLaterMonths?: number;

  /**
   * Client-generated idempotency key (UUID v4).
   * Re-submitting the same key returns the existing booking.
   */
  @IsString()
  idempotencyKey!: string;

  @ValidateNested()
  @Type(() => GuestDetailsDto)
  guestDetails!: GuestDetailsDto;

  /**
   * ISO timestamp recording when the guest accepted the cancellation policy + terms
   * of service. Required — the API rejects booking creation without it.
   */
  @IsDateString()
  acceptedTermsAt!: string;
}
