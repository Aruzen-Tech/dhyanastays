import { IsDateString, IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateHoldDto {
  @IsString()
  listingId!: string;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @IsInt()
  @Min(1)
  guests!: number;

  /**
   * Client-generated idempotency key (UUID v4 recommended).
   * Re-submitting the same key returns the existing hold.
   */
  @IsUUID()
  idempotencyKey!: string;
}
