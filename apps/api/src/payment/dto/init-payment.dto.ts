import { IsEnum, IsString, IsUUID } from 'class-validator';

export enum PaymentTypeDto {
  FULL = 'FULL',
  DEPOSIT = 'DEPOSIT',
  BALANCE = 'BALANCE',
}

export class InitPaymentDto {
  @IsString()
  bookingId!: string;

  @IsEnum(PaymentTypeDto)
  type!: PaymentTypeDto;

  /**
   * Client-generated idempotency key (UUID v4).
   * Re-submitting the same key returns the existing payment order.
   */
  @IsUUID()
  idempotencyKey!: string;
}
