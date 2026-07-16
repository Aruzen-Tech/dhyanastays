"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(NotificationService_1.name);
        this.emailProvider = config.get('EMAIL_PROVIDER', 'stub');
        this.smsProvider = config.get('SMS_PROVIDER', 'stub');
        this.fromEmail = config.get('EMAIL_FROM', 'noreply@dhyanastays.com');
        this.webUrl = config.get('WEB_URL', 'http://localhost:3000');
        this.isProduction = config.get('NODE_ENV') === 'production';
        if (this.isProduction) {
            if (this.emailProvider === 'stub') {
                throw new Error('EMAIL_PROVIDER must not be stub in production');
            }
            if (this.smsProvider === 'stub') {
                throw new Error('SMS_PROVIDER must not be stub in production');
            }
        }
    }
    buildIcsForBooking(payload) {
        if (!payload.checkInISO || !payload.checkOutISO)
            return null;
        const fmt = (iso) => {
            return new Date(iso)
                .toISOString()
                .replace(/[-:]/g, '')
                .replace(/\.\d{3}/, '');
        };
        const dtStart = fmt(payload.checkInISO);
        const dtEnd = fmt(payload.checkOutISO);
        const dtStamp = fmt(new Date().toISOString());
        const uid = `booking-${payload.bookingId}@dhyanastays.com`;
        const location = (payload.locationDescription ?? payload.listingTitle).replace(/[\r\n]+/g, ' ');
        const summary = `Stay at ${payload.listingTitle}`;
        const description = `Booking ID: ${payload.bookingId.slice(0, 12)} — View at ${this.webUrl}/bookings/${payload.bookingId}`;
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Dhyana Stays//Booking Confirmation//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART:${dtStart}`,
            `DTEND:${dtEnd}`,
            `SUMMARY:${summary}`,
            `LOCATION:${location}`,
            `DESCRIPTION:${description}`,
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');
        return {
            filename: 'booking.ics',
            contentBase64: Buffer.from(ics, 'utf-8').toString('base64'),
            contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
        };
    }
    buildBookingConfirmedEmail(payload) {
        const depositNote = payload.plan === 'DEPOSIT_50'
            ? `<p style="color:#b45309">Balance of ₹${this.formatINR(payload.totalAmount - (payload.depositAmount ?? 0))} is due before check-in.</p>`
            : '';
        const ics = this.buildIcsForBooking(payload);
        return {
            to: payload.guestEmail,
            subject: `Booking Confirmed — ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a5c4a">🎉 Your booking is confirmed!</h2>
          <p>Hi ${payload.guestName},</p>
          <p>Your stay at <strong>${payload.listingTitle}</strong> has been confirmed.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Booking ID</td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace">${payload.bookingId.slice(0, 12)}…</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Check-in</td>
                <td style="padding:8px;border:1px solid #e5e7eb">${payload.checkIn}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Check-out</td>
                <td style="padding:8px;border:1px solid #e5e7eb">${payload.checkOut}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Total</td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:#1a5c4a">₹${this.formatINR(payload.totalAmount)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Payment plan</td>
                <td style="padding:8px;border:1px solid #e5e7eb">${payload.plan === 'FULL' ? 'Paid in full' : '50% deposit paid'}</td></tr>
          </table>
          ${depositNote}
          <a href="${this.webUrl}/dashboard" style="display:inline-block;background:#1a5c4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            View booking
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `Booking confirmed for ${payload.listingTitle}. Check-in: ${payload.checkIn}. Check-out: ${payload.checkOut}. Total: ₹${this.formatINR(payload.totalAmount)}.`,
            ...(ics ? { attachments: [ics] } : {}),
        };
    }
    buildBookingConfirmedSms(payload) {
        if (!payload.guestPhone)
            return null;
        return {
            to: payload.guestPhone,
            body: `Dhyana Stays: Your booking for ${payload.listingTitle} (${payload.checkIn} → ${payload.checkOut}) is confirmed. Total: ₹${this.formatINR(payload.totalAmount)}. View: ${this.webUrl}/dashboard`,
        };
    }
    async sendBookingConfirmed(payload) {
        await this.sendEmail(this.buildBookingConfirmedEmail(payload));
        const sms = this.buildBookingConfirmedSms(payload);
        if (sms)
            await this.sendSms(sms);
    }
    async sendHostListingApproved(payload) {
        await this.sendEmail({
            to: payload.hostEmail,
            subject: `Your listing is live — ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a5c4a">✅ Your listing is approved!</h2>
          <p>Hi ${payload.hostName},</p>
          <p>Great news! Your listing <strong>${payload.listingTitle}</strong> has been approved and is now live on Dhyana Stays.</p>
          <a href="${this.webUrl}/listings/${payload.listingId}" style="display:inline-block;background:#1a5c4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            View your listing
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `Your listing "${payload.listingTitle}" has been approved and is now live on Dhyana Stays.`,
        });
    }
    async sendHostListingRejected(payload) {
        await this.sendEmail({
            to: payload.hostEmail,
            subject: `Update on your listing — ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#dc2626">Your listing needs attention</h2>
          <p>Hi ${payload.hostName},</p>
          <p>Your listing <strong>${payload.listingTitle}</strong> could not be approved at this time.</p>
          ${payload.note ? `<div style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:8px;margin:16px 0"><strong>Reason:</strong> ${payload.note}</div>` : ''}
          <p>Please contact us at <a href="mailto:support@dhyanastays.com">support@dhyanastays.com</a> if you have questions.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `Your listing "${payload.listingTitle}" was not approved. ${payload.note ? 'Reason: ' + payload.note : ''} Contact support@dhyanastays.com for help.`,
        });
    }
    async sendBalanceDueReminder(payload) {
        await this.sendEmail({
            to: payload.guestEmail,
            subject: `Balance payment due — ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#b45309">⚠️ Balance payment due</h2>
          <p>Hi ${payload.guestName},</p>
          <p>Your balance payment of <strong>₹${this.formatINR(payload.balanceAmount)}</strong> for <strong>${payload.listingTitle}</strong> is due by <strong>${payload.dueDate}</strong>.</p>
          <p>If payment is not received by the due date, your booking will be automatically cancelled.</p>
          <a href="${this.webUrl}/dashboard" style="display:inline-block;background:#b45309;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            Pay balance now
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `Balance of ₹${this.formatINR(payload.balanceAmount)} due by ${payload.dueDate} for ${payload.listingTitle}. Pay at ${this.webUrl}/dashboard`,
        });
        if (payload.guestPhone) {
            await this.sendSms({
                to: payload.guestPhone,
                body: `Dhyana Stays: Balance of ₹${this.formatINR(payload.balanceAmount)} due by ${payload.dueDate} for ${payload.listingTitle}. Pay: ${this.webUrl}/dashboard`,
            });
        }
    }
    async sendPayLaterReminder(payload) {
        const amountInr = this.formatINR(payload.amountMinor);
        const urgency = payload.hoursUntilDue <= 24 ? '⚠️ Due tomorrow' : '📅 Due in 3 days';
        await this.sendEmail({
            to: payload.guestEmail,
            subject: `${urgency} — Instalment ${payload.seq} for ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#b45309">${urgency}: Pay Later instalment</h2>
          <p>Hi ${payload.guestName},</p>
          <p>Instalment <strong>${payload.seq}</strong> of <strong>₹${amountInr}</strong> for your booking of <strong>${payload.listingTitle}</strong> is due on <strong>${payload.dueAt}</strong>.</p>
          <p>Pay on time to keep your booking active. If an instalment is missed beyond the grace period, your booking may be cancelled.</p>
          <a href="${this.webUrl}/bookings/${payload.bookingId}" style="display:inline-block;background:#b45309;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            Pay instalment
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `Instalment ${payload.seq} of ₹${amountInr} due ${payload.dueAt}. Pay: ${this.webUrl}/bookings/${payload.bookingId}`,
        });
        if (payload.guestPhone) {
            await this.sendSms({
                to: payload.guestPhone,
                body: `Dhyana Stays: Instalment ${payload.seq} of ₹${amountInr} due ${payload.dueAt}. Pay: ${this.webUrl}/bookings/${payload.bookingId}`,
            });
        }
    }
    async sendBookingCancelled(payload) {
        await this.sendEmail({
            to: payload.guestEmail,
            subject: `Booking cancelled — ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#dc2626">Booking cancelled</h2>
          <p>Hi ${payload.guestName},</p>
          <p>Your booking for <strong>${payload.listingTitle}</strong> (ID: ${payload.bookingId.slice(0, 12)}…) has been cancelled.</p>
          ${payload.refundAmount > 0
                ? `<p>A refund of <strong>₹${this.formatINR(payload.refundAmount)}</strong> will be processed to your original payment method within 5–7 business days.</p>`
                : `<p>No refund is applicable per the cancellation policy.</p>`}
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `Your booking for ${payload.listingTitle} has been cancelled. ${payload.refundAmount > 0 ? `Refund: ₹${this.formatINR(payload.refundAmount)}` : 'No refund applicable.'}`,
        });
    }
    async sendHostNewBooking(payload) {
        await this.sendEmail({
            to: payload.hostEmail,
            subject: `New booking — ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a5c4a">🎉 New booking received!</h2>
          <p>Hi ${payload.hostName},</p>
          <p><strong>${payload.guestName}</strong> has booked your listing <strong>${payload.listingTitle}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Check-in</td>
                <td style="padding:8px;border:1px solid #e5e7eb">${payload.checkIn}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Check-out</td>
                <td style="padding:8px;border:1px solid #e5e7eb">${payload.checkOut}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Total</td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:#1a5c4a">₹${this.formatINR(payload.totalAmount)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Plan</td>
                <td style="padding:8px;border:1px solid #e5e7eb">${payload.plan === 'FULL' ? 'Paid in full' : '50% deposit'}</td></tr>
          </table>
          <a href="${this.webUrl}/host/bookings" style="display:inline-block;background:#1a5c4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            View bookings
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `New booking for ${payload.listingTitle} by ${payload.guestName}. Check-in: ${payload.checkIn}. Check-out: ${payload.checkOut}. Total: ₹${this.formatINR(payload.totalAmount)}.`,
        });
    }
    async sendHostBookingCancelled(payload) {
        await this.sendEmail({
            to: payload.hostEmail,
            subject: `Booking cancelled — ${payload.listingTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#dc2626">Booking cancelled</h2>
          <p>Hi ${payload.hostName},</p>
          <p>A booking by <strong>${payload.guestName}</strong> for <strong>${payload.listingTitle}</strong> (ID: ${payload.bookingId.slice(0, 12)}…) has been cancelled.</p>
          ${payload.refundAmount > 0
                ? `<p>A refund of <strong>₹${this.formatINR(payload.refundAmount)}</strong> is being processed to the guest.</p>`
                : `<p>No refund was issued per the cancellation policy.</p>`}
          <a href="${this.webUrl}/host/bookings" style="display:inline-block;background:#1a5c4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            View bookings
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
            text: `Booking for ${payload.listingTitle} by ${payload.guestName} was cancelled. ${payload.refundAmount > 0 ? `Refund: ₹${this.formatINR(payload.refundAmount)}` : 'No refund.'}`,
        });
    }
    async sendEmail(payload) {
        try {
            switch (this.emailProvider) {
                case 'resend':
                    await this.sendViaResend(payload);
                    break;
                case 'sendgrid':
                    await this.sendViaSendGrid(payload);
                    break;
                case 'smtp':
                    await this.sendViaSmtp(payload);
                    break;
                default:
                    this.logger.log(`[EMAIL STUB] To: ${payload.to} | Subject: ${payload.subject}`);
                    this.logger.debug(`[EMAIL STUB] Body: ${payload.text ?? payload.html.replace(/<[^>]+>/g, '')}`);
            }
        }
        catch (err) {
            this.logger.error(`Failed to send email to ${payload.to}: ${String(err)}`);
        }
    }
    async sendSms(payload) {
        try {
            switch (this.smsProvider) {
                case 'msg91':
                    await this.sendViaMSG91(payload);
                    break;
                case 'twilio':
                    await this.sendViaTwilio(payload);
                    break;
                default:
                    this.logger.log(`[SMS STUB] To: ${payload.to} | Body: ${payload.body}`);
            }
        }
        catch (err) {
            this.logger.error(`Failed to send SMS to ${payload.to}: ${String(err)}`);
        }
    }
    async sendViaResend(payload) {
        const apiKey = this.config.get('RESEND_API_KEY', '');
        if (!apiKey) {
            if (this.isProduction) {
                throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend in production');
            }
            this.logger.warn('RESEND_API_KEY not set - falling back to stub');
            this.logger.log(`[EMAIL STUB] To: ${payload.to} | Subject: ${payload.subject}`);
            return;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: this.fromEmail,
                to: [payload.to],
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
                ...(payload.attachments && payload.attachments.length > 0
                    ? {
                        attachments: payload.attachments.map((a) => ({
                            filename: a.filename,
                            content: a.contentBase64,
                        })),
                    }
                    : {}),
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Resend API error ${res.status}: ${body}`);
        }
        this.logger.log(`Email sent via Resend to ${payload.to}`);
    }
    async sendViaSendGrid(payload) {
        const apiKey = this.config.get('SENDGRID_API_KEY', '');
        if (!apiKey) {
            if (this.isProduction) {
                throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid in production');
            }
            this.logger.warn('SENDGRID_API_KEY not set - falling back to stub');
            this.logger.log(`[EMAIL STUB] To: ${payload.to} | Subject: ${payload.subject}`);
            return;
        }
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: payload.to }] }],
                from: { email: this.fromEmail },
                subject: payload.subject,
                content: [
                    { type: 'text/html', value: payload.html },
                    ...(payload.text ? [{ type: 'text/plain', value: payload.text }] : []),
                ],
                ...(payload.attachments && payload.attachments.length > 0
                    ? {
                        attachments: payload.attachments.map((a) => ({
                            filename: a.filename,
                            content: a.contentBase64,
                            type: a.contentType,
                            disposition: 'attachment',
                        })),
                    }
                    : {}),
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`SendGrid API error ${res.status}: ${body}`);
        }
        this.logger.log(`Email sent via SendGrid to ${payload.to}`);
    }
    async sendViaSmtp(payload) {
        const host = this.config.get('SMTP_HOST', '');
        if (!host) {
            if (this.isProduction) {
                throw new Error('SMTP_HOST is required when EMAIL_PROVIDER=smtp in production');
            }
            this.logger.warn('SMTP_HOST not set - falling back to stub');
            this.logger.log(`[EMAIL STUB] To: ${payload.to} | Subject: ${payload.subject}`);
            return;
        }
        const transporter = nodemailer.createTransport({
            host,
            port: this.config.get('SMTP_PORT', 587),
            secure: false,
            auth: {
                user: this.config.get('SMTP_USER', ''),
                pass: this.config.get('SMTP_PASS', ''),
            },
        });
        await transporter.sendMail({
            from: this.fromEmail,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            ...(payload.attachments && payload.attachments.length > 0
                ? {
                    attachments: payload.attachments.map((a) => ({
                        filename: a.filename,
                        content: Buffer.from(a.contentBase64, 'base64'),
                        contentType: a.contentType,
                    })),
                }
                : {}),
        });
        this.logger.log(`Email sent via SMTP to ${payload.to}`);
    }
    async sendViaMSG91(payload) {
        const authKey = this.config.get('MSG91_AUTH_KEY', '');
        const templateId = this.config.get('MSG91_BOOKING_TEMPLATE_ID', '');
        const senderId = this.config.get('MSG91_SENDER_ID', 'DHYANA');
        if (!authKey) {
            if (this.isProduction) {
                throw new Error('MSG91_AUTH_KEY is required when SMS_PROVIDER=msg91 in production');
            }
            this.logger.warn('MSG91_AUTH_KEY not set - falling back to stub');
            this.logger.log(`[SMS STUB] To: ${payload.to} | Body: ${payload.body}`);
            return;
        }
        const mobile = payload.to.replace('+', '').replace(/\s/g, '');
        const res = await fetch('https://api.msg91.com/api/v5/flow/', {
            method: 'POST',
            headers: {
                authkey: authKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                template_id: templateId || undefined,
                sender: senderId,
                short_url: '0',
                mobiles: mobile,
                message: payload.body,
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`MSG91 API error ${res.status}: ${body}`);
        }
        this.logger.log(`SMS sent via MSG91 to ${payload.to}`);
    }
    async sendViaTwilio(payload) {
        const accountSid = this.config.get('TWILIO_ACCOUNT_SID', '');
        const authToken = this.config.get('TWILIO_AUTH_TOKEN', '');
        const fromNumber = this.config.get('TWILIO_FROM_NUMBER', '');
        if (!accountSid || !authToken) {
            if (this.isProduction) {
                throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required when SMS_PROVIDER=twilio in production');
            }
            this.logger.warn('Twilio credentials not set - falling back to stub');
            this.logger.log(`[SMS STUB] To: ${payload.to} | Body: ${payload.body}`);
            return;
        }
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                From: fromNumber,
                To: payload.to,
                Body: payload.body,
            }).toString(),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Twilio API error ${res.status}: ${body}`);
        }
        this.logger.log(`SMS sent via Twilio to ${payload.to}`);
    }
    formatINR(paise) {
        return (paise / 100).toLocaleString('en-IN');
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map