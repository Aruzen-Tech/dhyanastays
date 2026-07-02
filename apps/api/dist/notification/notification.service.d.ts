import { ConfigService } from '@nestjs/config';
export interface EmailAttachment {
    filename: string;
    contentBase64: string;
    contentType: string;
}
export interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
}
export interface SmsPayload {
    to: string;
    body: string;
}
export interface BookingConfirmedPayload {
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    bookingId: string;
    listingTitle: string;
    checkIn: string;
    checkOut: string;
    checkInISO?: string;
    checkOutISO?: string;
    locationDescription?: string;
    totalAmount: number;
    plan: 'FULL' | 'DEPOSIT_50';
    depositAmount?: number;
}
export interface HostListingApprovedPayload {
    hostName: string;
    hostEmail: string;
    listingTitle: string;
    listingId: string;
}
export interface HostListingRejectedPayload {
    hostName: string;
    hostEmail: string;
    listingTitle: string;
    note?: string;
}
export interface BalanceDueReminderPayload {
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    bookingId: string;
    listingTitle: string;
    balanceAmount: number;
    dueDate: string;
}
export interface BookingCancelledPayload {
    guestName: string;
    guestEmail: string;
    bookingId: string;
    listingTitle: string;
    refundAmount: number;
}
export interface PayLaterReminderPayload {
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    bookingId: string;
    listingTitle: string;
    seq: number;
    amountMinor: number;
    dueAt: string;
    hoursUntilDue: number;
}
export interface HostNewBookingPayload {
    hostName: string;
    hostEmail: string;
    guestName: string;
    bookingId: string;
    listingTitle: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    plan: 'FULL' | 'DEPOSIT_50';
}
export interface HostBookingCancelledPayload {
    hostName: string;
    hostEmail: string;
    guestName: string;
    bookingId: string;
    listingTitle: string;
    refundAmount: number;
}
export declare class NotificationService {
    private readonly config;
    private readonly logger;
    private readonly emailProvider;
    private readonly smsProvider;
    private readonly fromEmail;
    private readonly webUrl;
    private readonly isProduction;
    constructor(config: ConfigService);
    private buildIcsForBooking;
    buildBookingConfirmedEmail(payload: BookingConfirmedPayload): EmailPayload;
    buildBookingConfirmedSms(payload: BookingConfirmedPayload): SmsPayload | null;
    sendBookingConfirmed(payload: BookingConfirmedPayload): Promise<void>;
    sendHostListingApproved(payload: HostListingApprovedPayload): Promise<void>;
    sendHostListingRejected(payload: HostListingRejectedPayload): Promise<void>;
    sendBalanceDueReminder(payload: BalanceDueReminderPayload): Promise<void>;
    sendPayLaterReminder(payload: PayLaterReminderPayload): Promise<void>;
    sendBookingCancelled(payload: BookingCancelledPayload): Promise<void>;
    sendHostNewBooking(payload: HostNewBookingPayload): Promise<void>;
    sendHostBookingCancelled(payload: HostBookingCancelledPayload): Promise<void>;
    sendEmail(payload: EmailPayload): Promise<void>;
    sendSms(payload: SmsPayload): Promise<void>;
    private sendViaResend;
    private sendViaSendGrid;
    private sendViaSmtp;
    private sendViaMSG91;
    private sendViaTwilio;
    private formatINR;
}
