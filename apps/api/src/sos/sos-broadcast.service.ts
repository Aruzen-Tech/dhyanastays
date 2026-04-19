import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

interface BroadcastAttempt {
  channel: string;
  target: string;
  status: 'SENT' | 'FAILED';
  lastError?: string;
}

/**
 * Fans out a single SOS incident to every trusted contact + ops-on-duty
 * channel. We intentionally skip the outbox here: SOS is latency-critical
 * and the 30-second outbox sweep would violate the P99 < 5 s SLA. Failures
 * are recorded on SosBroadcast rows so ops can see which channels missed.
 */
@Injectable()
export class SosBroadcastService {
  private readonly logger = new Logger(SosBroadcastService.name);
  private readonly opsPhone: string;
  private readonly opsEmail: string;
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
  ) {
    this.opsPhone = this.config.get<string>('SOS_OPS_PHONE', '');
    this.opsEmail = this.config.get<string>('SOS_OPS_EMAIL', '');
    this.webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
  }

  async broadcast(incidentId: string): Promise<void> {
    const incident = await this.prisma.sosIncident.findUnique({
      where: { id: incidentId },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        booking: { select: { listing: { select: { title: true } } } },
      },
    });
    if (!incident) {
      this.logger.warn(`SOS broadcast skipped — incident ${incidentId} missing`);
      return;
    }

    const contacts = await this.prisma.trustedContact.findMany({
      where: { userId: incident.userId },
    });

    const mapsLink = `https://maps.google.com/?q=${incident.lat},${incident.lng}`;
    const listingLabel = incident.booking?.listing?.title ?? 'off-platform';
    const smsBody = `Dhyana Stays SOS (${incident.tier}): ${incident.user.fullName} needs help at ${listingLabel}. Location: ${mapsLink}${
      incident.message ? ` — "${incident.message}"` : ''
    }`;

    const attempts: BroadcastAttempt[] = [];

    // 1. Trusted contacts — SMS each
    for (const c of contacts) {
      attempts.push(await this.trySms(c.phone, smsBody, 'trusted_contact'));
    }

    // 2. Ops-on-duty — SMS + email (first response team)
    if (this.opsPhone) {
      attempts.push(await this.trySms(this.opsPhone, smsBody, 'ops_sms'));
    }
    if (this.opsEmail) {
      attempts.push(
        await this.tryEmail(this.opsEmail, {
          subject: `SOS ${incident.tier} — ${incident.user.fullName}`,
          html: this.renderOpsEmail(incident, mapsLink, listingLabel),
          text: smsBody,
        }),
      );
    }

    // Persist audit rows in one batch.
    await this.prisma.sosBroadcast.createMany({
      data: attempts.map((a) => ({
        incidentId,
        channel: a.channel,
        target: a.target,
        status: a.status,
        lastError: a.lastError,
      })),
    });

    const failed = attempts.filter((a) => a.status === 'FAILED').length;
    this.logger.warn(
      `SOS ${incidentId} broadcast: ${attempts.length - failed}/${attempts.length} channels delivered`,
    );
  }

  private async trySms(
    to: string,
    body: string,
    channelLabel: string,
  ): Promise<BroadcastAttempt> {
    try {
      await this.notifications.sendSms({ to, body });
      return { channel: channelLabel, target: to, status: 'SENT' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        channel: channelLabel,
        target: to,
        status: 'FAILED',
        lastError: msg.slice(0, 500),
      };
    }
  }

  private async tryEmail(
    to: string,
    mail: { subject: string; html: string; text: string },
  ): Promise<BroadcastAttempt> {
    try {
      await this.notifications.sendEmail({ to, ...mail });
      return { channel: 'ops_email', target: to, status: 'SENT' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        channel: 'ops_email',
        target: to,
        status: 'FAILED',
        lastError: msg.slice(0, 500),
      };
    }
  }

  private renderOpsEmail(
    incident: {
      id: string;
      tier: string;
      lat: number;
      lng: number;
      message: string | null;
      user: { fullName: string; phone: string | null };
    },
    mapsLink: string,
    listingLabel: string,
  ) {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">🚨 SOS ${incident.tier}</h2>
        <p><strong>${incident.user.fullName}</strong>${
          incident.user.phone ? ` (${incident.user.phone})` : ''
        } triggered an SOS at <strong>${listingLabel}</strong>.</p>
        ${incident.message ? `<blockquote style="border-left:3px solid #dc2626;padding:8px 12px;color:#374151">${incident.message}</blockquote>` : ''}
        <p><a href="${mapsLink}" style="display:inline-block;background:#dc2626;color:white;padding:10px 18px;border-radius:8px;text-decoration:none">Open location</a></p>
        <p><a href="${this.webUrl}/admin/sos/${incident.id}">Acknowledge in ops console →</a></p>
      </div>
    `;
  }
}
