import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { PayLaterMonths } from './dto/create-plan.dto';
type TxClient = any;
export declare const PAY_LATER_GRACE_HOURS: number;
export interface InstalmentSchedule {
    seq: number;
    amountMinor: number;
    dueAt: Date;
}
export declare class PayLaterService {
    private readonly prisma;
    private readonly auditService;
    private readonly ledgerService;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, ledgerService: LedgerService, notificationService: NotificationService);
    static splitAmount(totalMinor: number, months: number): number[];
    static buildSchedule(totalMinor: number, months: PayLaterMonths, startFrom?: Date): InstalmentSchedule[];
    static assertScheduleFitsCheckIn(schedule: InstalmentSchedule[], checkInAt: Date): void;
    createPlanFromFirstCapture(tx: TxClient, booking: {
        id: string;
        startsAt: Date;
        priceSnapshot: unknown;
    }, months: PayLaterMonths, totalMinor: number, firstPaymentId: string, firstAmountMinor: number): Promise<void>;
    getPlanForBooking(bookingId: string, guestId: string): Promise<{
        instalments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            paymentId: string | null;
            amountMinor: number;
            paidAt: Date | null;
            dueAt: Date;
            planId: string;
            seq: number;
            remindersSent: number;
            lastReminderAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PayLaterStatus;
        bookingId: string;
        currency: string;
        totalMinor: number;
        months: number;
    }>;
    getNextDueInstalment(bookingId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentId: string | null;
        amountMinor: number;
        paidAt: Date | null;
        dueAt: Date;
        planId: string;
        seq: number;
        remindersSent: number;
        lastReminderAt: Date | null;
    } | null>;
    recordInstalmentCapture(tx: TxClient, bookingId: string, seq: number, paymentId: string, amountMinor: number): Promise<{
        completed: boolean;
    }>;
    processOverdue(now?: Date): Promise<{
        markedOverdue: number;
        defaulted: {
            planId: string;
            bookingId: string;
        }[];
    }>;
    sendDueReminders(now?: Date): Promise<number>;
    cancelPlan(tx: TxClient, bookingId: string): Promise<void>;
}
export {};
