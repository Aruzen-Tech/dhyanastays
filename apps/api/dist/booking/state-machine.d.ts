import { ConflictException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
export type BookingEvent = 'PAYMENT_CONFIRMED_FULL' | 'PAYMENT_CONFIRMED_DEPOSIT' | 'PAY_LATER_FIRST_CAPTURED' | 'PAY_LATER_INSTALMENT_CAPTURED' | 'PAY_LATER_FINAL_CAPTURED' | 'BALANCE_DUE_TRIGGERED' | 'BALANCE_PAID' | 'GUEST_CANCELLED' | 'ADMIN_CANCELLED' | 'AUTO_CANCEL_UNPAID_BALANCE' | 'AUTO_CANCEL_PAY_LATER_DEFAULT' | 'STAY_COMPLETED' | 'AUTO_COMPLETED' | 'ADMIN_FULL_REFUND_ISSUED';
export interface TransitionContext {
    actorId: string | null;
    metadata?: Record<string, unknown>;
    refundAmountPaise?: number;
}
interface Transition {
    from: BookingStatus[];
    to: BookingStatus | ((booking: BookingLike, ctx: TransitionContext) => BookingStatus);
    event: BookingEvent;
    guard?: (booking: BookingLike, ctx: TransitionContext) => boolean;
}
export interface BookingLike {
    id: string;
    status: BookingStatus;
    plan: string;
    startsAt: Date;
    endsAt: Date;
    balanceDueAt: Date | null;
    payLaterMonths: number | null;
    statusHistory: Prisma.JsonValue;
}
export interface StatusHistoryEntry {
    from: BookingStatus;
    to: BookingStatus;
    event: BookingEvent;
    actorId: string | null;
    at: string;
    metadata?: Record<string, unknown>;
}
export declare class IllegalTransitionException extends ConflictException {
    constructor(from: BookingStatus, event: BookingEvent);
}
export declare class GuardFailedException extends ConflictException {
    constructor(event: BookingEvent, reason: string);
}
export declare const TRANSITIONS: readonly Transition[];
export declare class BookingStateMachine {
    transition<T extends BookingLike>(tx: Prisma.TransactionClient, booking: T, event: BookingEvent, ctx: TransitionContext): Promise<Awaited<ReturnType<Prisma.TransactionClient['booking']['update']>>>;
    static readHistory(booking: {
        statusHistory: Prisma.JsonValue;
    }): StatusHistoryEntry[];
}
export {};
