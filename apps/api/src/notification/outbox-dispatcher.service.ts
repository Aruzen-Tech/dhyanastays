import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationOutbox } from '@prisma/client';
import { NotificationService } from './notification.service';
import { OutboxService } from './outbox.service';

interface EmailSlot {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SmsSlot {
  to: string;
  body: string;
}

/**
 * OutboxDispatcher reads the channel + payload from a NotificationOutbox
 * row and delegates to the matching NotificationService adapter. Failures
 * propagate as exceptions so the processor can schedule a retry.
 *
 * Payload shape per channel:
 *   EMAIL    → { to, subject, html, text? }
 *   SMS      → { to, body }
 *   WHATSAPP → { to, templateName, variables? }   (stubbed for now)
 *   PUSH     → { deviceTokens: string[], title, body, data? } (stubbed)
 *   IN_APP   → persisted to GuestNotification via NotificationService
 *              (not dispatched here — callers already use that path).
 */
@Injectable()
export class OutboxDispatcher {
  private readonly logger = new Logger(OutboxDispatcher.name);

  constructor(
    private readonly notifications: NotificationService,
    private readonly outbox: OutboxService,
  ) {}

  async dispatch(row: NotificationOutbox): Promise<void> {
    try {
      switch (row.channel) {
        case NotificationChannel.EMAIL:
          await this.dispatchEmail(row);
          break;
        case NotificationChannel.SMS:
          await this.dispatchSms(row);
          break;
        case NotificationChannel.WHATSAPP:
          await this.dispatchWhatsApp(row);
          break;
        case NotificationChannel.PUSH:
          await this.dispatchPush(row);
          break;
        case NotificationChannel.IN_APP:
          // IN_APP rows are informational — nothing to send.
          break;
      }
      await this.outbox.markSent(row.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Outbox ${row.id} dispatch failed: ${msg}`);
      await this.outbox.recordFailure(row.id, msg);
    }
  }

  private async dispatchEmail(row: NotificationOutbox): Promise<void> {
    const p = row.payload as unknown as EmailSlot;
    if (!p?.to || !p?.subject || !p?.html) {
      throw new Error('Email outbox row missing to/subject/html');
    }
    await this.notifications.sendEmail({
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text,
    });
  }

  private async dispatchSms(row: NotificationOutbox): Promise<void> {
    const p = row.payload as unknown as SmsSlot;
    if (!p?.to || !p?.body) {
      throw new Error('SMS outbox row missing to/body');
    }
    await this.notifications.sendSms({ to: p.to, body: p.body });
  }

  private dispatchWhatsApp(row: NotificationOutbox): Promise<void> {
    this.logger.log(
      `[WHATSAPP STUB] outbox ${row.id} kind=${row.kind} — awaiting Cloud API adapter`,
    );
    return Promise.resolve();
  }

  private dispatchPush(row: NotificationOutbox): Promise<void> {
    this.logger.log(
      `[PUSH STUB] outbox ${row.id} kind=${row.kind} — awaiting FCM/APNs adapter`,
    );
    return Promise.resolve();
  }
}
