import { PrismaService } from '../../prisma/prisma.service';
type TxClient = any;
export type LedgerEventTypeValue = 'PAYMENT_CAPTURED' | 'REFUND_ISSUED' | 'PAYOUT_SCHEDULED' | 'PAYOUT_SENT' | 'BALANCE_CARRY_FORWARD';
export interface LedgerEventInput {
    type: LedgerEventTypeValue;
    amount: number;
    bookingId?: string;
    payoutLineId?: string;
    metadata: Record<string, unknown>;
    tx?: TxClient;
}
export declare class LedgerService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    record(input: LedgerEventInput): Promise<void>;
}
export {};
