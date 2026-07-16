import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// ─── Email payload ────────────────────────────────────────────────────────────

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content (so it survives outbox JSON serialization). */
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

// ─── SMS payload ──────────────────────────────────────────────────────────────

export interface SmsPayload {
  to: string;   // E.164 format: +91XXXXXXXXXX
  body: string;
}

// ─── Notification templates ───────────────────────────────────────────────────

export interface BookingConfirmedPayload {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  bookingId: string;
  listingTitle: string;
  /** Human-readable check-in date (e.g. "11 May 2026") — for the email body. */
  checkIn: string;
  /** Human-readable check-out date. */
  checkOut: string;
  /** ISO 8601 check-in datetime — for the ICS calendar attachment. */
  checkInISO?: string;
  /** ISO 8601 check-out datetime — for the ICS calendar attachment. */
  checkOutISO?: string;
  /** Optional property location string for the ICS LOCATION field. */
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

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly emailProvider: string;
  private readonly smsProvider: string;
  private readonly fromEmail: string;
  private readonly webUrl: string;

  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.emailProvider = config.get<string>('EMAIL_PROVIDER', 'stub');
    this.smsProvider = config.get<string>('SMS_PROVIDER', 'stub');
    this.fromEmail = config.get<string>('EMAIL_FROM', 'noreply@dhyanastays.com');
    this.webUrl = config.get<string>('WEB_URL', 'http://localhost:3000');
    this.isProduction = config.get<string>('NODE_ENV') === 'production';

    if (this.isProduction) {
      if (this.emailProvider === 'stub') {
        throw new Error('EMAIL_PROVIDER must not be stub in production');
      }
      if (this.smsProvider === 'stub') {
        throw new Error('SMS_PROVIDER must not be stub in production');
      }
    }
  }

  // ── Public notification methods ─────────────────────────────────────────────

  /**
   * Build an RFC 5545 ICS file for a booking — guests can click "Add to Calendar"
   * in supported email clients (Gmail, Outlook, Apple Mail).
   * Returns null if check-in/check-out ISO timestamps aren't provided.
   */
  private buildIcsForBooking(payload: BookingConfirmedPayload): EmailAttachment | null {
    if (!payload.checkInISO || !payload.checkOutISO) return null;

    const fmt = (iso: string): string => {
      // ICS DATE-TIME format: YYYYMMDDTHHMMSSZ (UTC)
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
    ].join('\r\n'); // RFC 5545 requires CRLF line endings

    return {
      filename: 'booking.ics',
      contentBase64: Buffer.from(ics, 'utf-8').toString('base64'),
      contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
    };
  }

  buildBookingConfirmedEmail(payload: BookingConfirmedPayload): EmailPayload {
    const depositNote =
      payload.plan === 'DEPOSIT_50'
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

  buildBookingConfirmedSms(payload: BookingConfirmedPayload): SmsPayload | null {
    if (!payload.guestPhone) return null;
    return {
      to: payload.guestPhone,
      body: `Dhyana Stays: Your booking for ${payload.listingTitle} (${payload.checkIn} → ${payload.checkOut}) is confirmed. Total: ₹${this.formatINR(payload.totalAmount)}. View: ${this.webUrl}/dashboard`,
    };
  }

  async sendBookingConfirmed(payload: BookingConfirmedPayload): Promise<void> {
    await this.sendEmail(this.buildBookingConfirmedEmail(payload));
    const sms = this.buildBookingConfirmedSms(payload);
    if (sms) await this.sendSms(sms);
  }

  async sendHostListingApproved(payload: HostListingApprovedPayload): Promise<void> {
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

  async sendHostListingRejected(payload: HostListingRejectedPayload): Promise<void> {
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

  async sendBalanceDueReminder(payload: BalanceDueReminderPayload): Promise<void> {
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

  async sendPayLaterReminder(payload: PayLaterReminderPayload): Promise<void> {
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

  async sendBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
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
            : `<p>No refund is applicable per the cancellation policy.</p>`
          }
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
      text: `Your booking for ${payload.listingTitle} has been cancelled. ${payload.refundAmount > 0 ? `Refund: ₹${this.formatINR(payload.refundAmount)}` : 'No refund applicable.'}`,
    });
  }

  async sendHostNewBooking(payload: HostNewBookingPayload): Promise<void> {
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

  async sendHostBookingCancelled(payload: HostBookingCancelledPayload): Promise<void> {
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
            : `<p>No refund was issued per the cancellation policy.</p>`
          }
          <a href="${this.webUrl}/host/bookings" style="display:inline-block;background:#1a5c4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            View bookings
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Dhyana Stays · support@dhyanastays.com</p>
        </div>
      `,
      text: `Booking for ${payload.listingTitle} by ${payload.guestName} was cancelled. ${payload.refundAmount > 0 ? `Refund: ₹${this.formatINR(payload.refundAmount)}` : 'No refund.'}`,
    });
  }

  // ── Core send methods ───────────────────────────────────────────────────────

  async sendEmail(payload: EmailPayload): Promise<void> {
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
    } catch (err) {
      this.logger.error(`Failed to send email to ${payload.to}: ${String(err)}`);
      // Non-fatal — don't throw; notification failure should not break booking flow
    }
  }

  async sendSms(payload: SmsPayload): Promise<void> {
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
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${payload.to}: ${String(err)}`);
      // Non-fatal
    }
  }

  // ── Email provider implementations ─────────────────────────────────────────

  private async sendViaResend(payload: EmailPayload): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '');
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

  private async sendViaSendGrid(payload: EmailPayload): Promise<void> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY', '');
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

  private async sendViaSmtp(payload: EmailPayload): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST', '');
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
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER', ''),
        pass: this.config.get<string>('SMTP_PASS', ''),
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

  // ── SMS provider implementations ───────────────────────────────────────────

  private async sendViaMSG91(payload: SmsPayload): Promise<void> {
    const authKey = this.config.get<string>('MSG91_AUTH_KEY', '');
    const templateId = this.config.get<string>('MSG91_BOOKING_TEMPLATE_ID', '');
    const senderId = this.config.get<string>('MSG91_SENDER_ID', 'DHYANA');

    if (!authKey) {
      if (this.isProduction) {
        throw new Error('MSG91_AUTH_KEY is required when SMS_PROVIDER=msg91 in production');
      }
      this.logger.warn('MSG91_AUTH_KEY not set - falling back to stub');
      this.logger.log(`[SMS STUB] To: ${payload.to} | Body: ${payload.body}`);
      return;
    }

    // MSG91 Flow API (supports DLT templates required by TRAI)
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
        // For non-template SMS (testing only — DLT required for production India):
        message: payload.body,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MSG91 API error ${res.status}: ${body}`);
    }
    this.logger.log(`SMS sent via MSG91 to ${payload.to}`);
  }

  private async sendViaTwilio(payload: SmsPayload): Promise<void> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    const fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER', '');

    if (!accountSid || !authToken) {
      if (this.isProduction) {
        throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required when SMS_PROVIDER=twilio in production');
      }
      this.logger.warn('Twilio credentials not set - falling back to stub');
      this.logger.log(`[SMS STUB] To: ${payload.to} | Body: ${payload.body}`);
      return;
    }

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
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
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Twilio API error ${res.status}: ${body}`);
    }
    this.logger.log(`SMS sent via Twilio to ${payload.to}`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private formatINR(paise: number): string {
    return (paise / 100).toLocaleString('en-IN');
  }
}
