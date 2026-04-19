import { IsUUID } from 'class-validator';

export class PayInstalmentDto {
  /** Client-generated idempotency key (UUID v4) — same semantics as InitPaymentDto. */
  @IsUUID()
  idempotencyKey!: string;
}
