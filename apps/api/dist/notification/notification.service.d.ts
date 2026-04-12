import { ConfigService } from '@nestjs/config';
export interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
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
export declare class NotificationService {
    private readonly config;
    private readonly logger;
    private readonly emailProvider;
    private readonly smsProvider;
    private readonly fromEmail;
    private readonly webUrl;
    constructor(config: ConfigService);
    sendBookingConfirmed(payload: BookingConfirmedPayload): Promise<void>;
    sendHostListingApproved(payload: HostListingApprovedPayload): Promise<void>;
    sendHostListingRejected(payload: HostListingRejectedPayload): Promise<void>;
    sendBalanceDueReminder(payload: BalanceDueReminderPayload): Promise<void>;
    sendBookingCancelled(payload: BookingCancelledPayload): Promise<void>;
    sendEmail(payload: EmailPayload): Promise<void>;
    sendSms(payload: SmsPayload): Promise<void>;
    private sendViaResend;
    private sendViaSendGrid;
    private sendViaSmtp;
    private sendViaMSG91;
    private sendViaTwilio;
    private formatINR;
}
