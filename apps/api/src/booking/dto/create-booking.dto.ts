import { IsEnum, IsString } from 'class-validator';

export enum PaymentPlanDto {
  FULL = 'FULL',
  DEPOSIT_50 = 'DEPOSIT_50',
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
}
