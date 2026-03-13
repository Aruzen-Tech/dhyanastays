import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

// Mirror of LedgerEventType enum from schema (avoids needing generated client at compile time)
export type LedgerEventTypeValue =
  | 'PAYMENT_CAPTURED'
  | 'REFUND_ISSUED'
  | 'PAYOUT_SCHEDULED'
  | 'PAYOUT_SENT'
  | 'BALANCE_CARRY_FORWARD';

export interface LedgerEventInput {
  type: LedgerEventTypeValue;
  amount: number;
  bookingId?: string;
  payoutLineId?: string;
  metadata: Record<string, unknown>;
  tx?: TxClient;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: LedgerEventInput): Promise<void> {
    const client: TxClient = input.tx ?? this.prisma;
    await client.ledgerEvent.create({
      data: {
        type: input.type,
        amount: input.amount,
        currency: 'INR',
        bookingId: input.bookingId ?? null,
        payoutLineId: input.payoutLineId ?? null,
        metadata: input.metadata,
      },
    });
  }
}
