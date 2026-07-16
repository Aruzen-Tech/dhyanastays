"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SosBroadcastService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SosBroadcastService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const admin_notification_service_1 = require("../admin/admin-notification.service");
const CB_THRESHOLD = 3;
const CB_COOLDOWN_MS = 60 * 1000;
let SosBroadcastService = SosBroadcastService_1 = class SosBroadcastService {
    constructor(prisma, notifications, config, adminNotifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.config = config;
        this.adminNotifications = adminNotifications;
        this.logger = new common_1.Logger(SosBroadcastService_1.name);
        this.smsCbState = 'CLOSED';
        this.smsCbConsecutiveFailures = 0;
        this.smsCbOpenedAt = null;
        this.opsPhone = this.config.get('SOS_OPS_PHONE', '');
        this.opsEmail = this.config.get('SOS_OPS_EMAIL', '');
        this.webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
        if (this.config.get('NODE_ENV') === 'production') {
            if (!this.opsPhone || !this.opsEmail) {
                throw new Error('SOS_OPS_PHONE and SOS_OPS_EMAIL are required in production — refusing to start SOS broadcast worker');
            }
        }
    }
    async broadcast(incidentId) {
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
        const smsBody = `Dhyana Stays SOS (${incident.tier}): ${incident.user.fullName} needs help at ${listingLabel}. Location: ${mapsLink}${incident.message ? ` — "${incident.message}"` : ''}`;
        const contactEmailSubject = `🚨 SOS — ${incident.user.fullName} needs help`;
        const contactEmailHtml = this.renderTrustedContactEmail(incident, mapsLink, listingLabel);
        const attempts = [];
        for (const c of contacts) {
            if (c.phone) {
                attempts.push(await this.trySms(c.phone, smsBody, 'trusted_contact_sms'));
            }
            if (c.email) {
                attempts.push(await this.tryEmail(c.email, {
                    subject: contactEmailSubject,
                    html: contactEmailHtml,
                    text: smsBody,
                }, 'trusted_contact_email'));
            }
        }
        if (this.opsPhone) {
            attempts.push(await this.trySms(this.opsPhone, smsBody, 'ops_sms'));
        }
        if (this.opsEmail) {
            attempts.push(await this.tryEmail(this.opsEmail, {
                subject: `SOS ${incident.tier} — ${incident.user.fullName}`,
                html: this.renderOpsEmail(incident, mapsLink, listingLabel),
                text: smsBody,
            }, 'ops_email'));
        }
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
        this.logger.warn(`SOS ${incidentId} broadcast: ${attempts.length - failed}/${attempts.length} channels delivered`);
    }
    async trySms(to, body, channelLabel) {
        const decision = this.shouldAttemptSms();
        if (decision === 'SKIP') {
            this.logger.error(`SOS SMS breaker OPEN — skipping ${channelLabel} to ${to}. Ops MUST still see this via email channel.`);
            return {
                channel: channelLabel,
                target: to,
                status: 'SKIPPED',
                lastError: 'sms_circuit_breaker_open',
            };
        }
        try {
            await this.notifications.sendSms({ to, body });
            this.recordSmsSuccess();
            return { channel: channelLabel, target: to, status: 'SENT' };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.recordSmsFailure(msg);
            return {
                channel: channelLabel,
                target: to,
                status: 'FAILED',
                lastError: msg.slice(0, 500),
            };
        }
    }
    shouldAttemptSms() {
        if (this.smsCbState === 'CLOSED')
            return 'ATTEMPT';
        if (this.smsCbState === 'OPEN' && this.smsCbOpenedAt !== null) {
            const elapsed = Date.now() - this.smsCbOpenedAt;
            if (elapsed >= CB_COOLDOWN_MS) {
                this.smsCbState = 'HALF_OPEN';
                this.logger.warn('SOS SMS breaker HALF_OPEN — probing provider with one attempt');
                return 'ATTEMPT';
            }
            return 'SKIP';
        }
        return 'ATTEMPT';
    }
    recordSmsSuccess() {
        if (this.smsCbState !== 'CLOSED') {
            this.logger.warn('SOS SMS breaker CLOSED — provider recovered');
        }
        this.smsCbState = 'CLOSED';
        this.smsCbConsecutiveFailures = 0;
        this.smsCbOpenedAt = null;
    }
    recordSmsFailure(reason) {
        this.smsCbConsecutiveFailures += 1;
        if (this.smsCbState === 'HALF_OPEN') {
            this.smsCbState = 'OPEN';
            this.smsCbOpenedAt = Date.now();
            this.logger.error(`SOS SMS breaker OPEN (probe failed): ${reason.slice(0, 200)}`);
            return;
        }
        if (this.smsCbState === 'CLOSED' &&
            this.smsCbConsecutiveFailures >= CB_THRESHOLD) {
            this.smsCbState = 'OPEN';
            this.smsCbOpenedAt = Date.now();
            this.logger.error(`SOS SMS breaker OPEN after ${CB_THRESHOLD} consecutive failures: ${reason.slice(0, 200)}`);
            void this.adminNotifications
                .create('SOS_SMS_DEGRADED', 'SOS SMS provider degraded', `SMS circuit breaker opened after ${CB_THRESHOLD} consecutive failures. ` +
                `New SOS incidents will fall back to email-only for ops/trusted contacts until provider recovers ` +
                `(cooldown: ${CB_COOLDOWN_MS / 1000}s). Last error: ${reason.slice(0, 200)}`, { reason: reason.slice(0, 500), cooldownMs: CB_COOLDOWN_MS })
                .catch((err) => this.logger.error(`Failed to write SOS_SMS_DEGRADED admin notification: ${err instanceof Error ? err.message : String(err)}`));
        }
    }
    getSmsBreakerStateForTesting() {
        return {
            state: this.smsCbState,
            consecutiveFailures: this.smsCbConsecutiveFailures,
            openedAt: this.smsCbOpenedAt,
        };
    }
    async tryEmail(to, mail, channelLabel = 'ops_email') {
        try {
            await this.notifications.sendEmail({ to, ...mail });
            return { channel: channelLabel, target: to, status: 'SENT' };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                channel: channelLabel,
                target: to,
                status: 'FAILED',
                lastError: msg.slice(0, 500),
            };
        }
    }
    renderTrustedContactEmail(incident, mapsLink, listingLabel) {
        return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">🚨 SOS — ${incident.user.fullName} needs help</h2>
        <p>You're listed as an emergency contact on Dhyana Stays. ${incident.user.fullName}${incident.user.phone ? ` (${incident.user.phone})` : ''} has triggered an SOS alert.</p>
        <p><strong>Tier:</strong> ${incident.tier}</p>
        <p><strong>Where:</strong> ${listingLabel}</p>
        ${incident.message ? `<blockquote style="border-left:3px solid #dc2626;padding:8px 12px;color:#374151">${incident.message}</blockquote>` : ''}
        <p><a href="${mapsLink}" style="display:inline-block;background:#dc2626;color:white;padding:10px 18px;border-radius:8px;text-decoration:none">View location on map</a></p>
        <p style="color:#6b7280;font-size:13px">Our 24/7 ops team has been notified. If this is a life-threatening emergency in India, also call 112.</p>
      </div>
    `;
    }
    renderOpsEmail(incident, mapsLink, listingLabel) {
        return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">🚨 SOS ${incident.tier}</h2>
        <p><strong>${incident.user.fullName}</strong>${incident.user.phone ? ` (${incident.user.phone})` : ''} triggered an SOS at <strong>${listingLabel}</strong>.</p>
        ${incident.message ? `<blockquote style="border-left:3px solid #dc2626;padding:8px 12px;color:#374151">${incident.message}</blockquote>` : ''}
        <p><a href="${mapsLink}" style="display:inline-block;background:#dc2626;color:white;padding:10px 18px;border-radius:8px;text-decoration:none">Open location</a></p>
        <p><a href="${this.webUrl}/admin/sos/${incident.id}">Acknowledge in ops console →</a></p>
      </div>
    `;
    }
};
exports.SosBroadcastService = SosBroadcastService;
exports.SosBroadcastService = SosBroadcastService = SosBroadcastService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        config_1.ConfigService,
        admin_notification_service_1.AdminNotificationService])
], SosBroadcastService);
//# sourceMappingURL=sos-broadcast.service.js.map