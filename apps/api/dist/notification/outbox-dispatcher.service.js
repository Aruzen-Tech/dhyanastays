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
var OutboxDispatcher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxDispatcher = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const notification_service_1 = require("./notification.service");
const outbox_service_1 = require("./outbox.service");
let OutboxDispatcher = OutboxDispatcher_1 = class OutboxDispatcher {
    constructor(notifications, outbox) {
        this.notifications = notifications;
        this.outbox = outbox;
        this.logger = new common_1.Logger(OutboxDispatcher_1.name);
    }
    async dispatch(row) {
        try {
            switch (row.channel) {
                case client_1.NotificationChannel.EMAIL:
                    await this.dispatchEmail(row);
                    break;
                case client_1.NotificationChannel.SMS:
                    await this.dispatchSms(row);
                    break;
                case client_1.NotificationChannel.WHATSAPP:
                    await this.dispatchWhatsApp(row);
                    break;
                case client_1.NotificationChannel.PUSH:
                    await this.dispatchPush(row);
                    break;
                case client_1.NotificationChannel.IN_APP:
                    break;
            }
            await this.outbox.markSent(row.id);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Outbox ${row.id} dispatch failed: ${msg}`);
            await this.outbox.recordFailure(row.id, msg);
        }
    }
    async dispatchEmail(row) {
        const p = row.payload;
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
    async dispatchSms(row) {
        const p = row.payload;
        if (!p?.to || !p?.body) {
            throw new Error('SMS outbox row missing to/body');
        }
        await this.notifications.sendSms({ to: p.to, body: p.body });
    }
    dispatchWhatsApp(row) {
        this.logger.log(`[WHATSAPP STUB] outbox ${row.id} kind=${row.kind} — awaiting Cloud API adapter`);
        return Promise.resolve();
    }
    dispatchPush(row) {
        this.logger.log(`[PUSH STUB] outbox ${row.id} kind=${row.kind} — awaiting FCM/APNs adapter`);
        return Promise.resolve();
    }
};
exports.OutboxDispatcher = OutboxDispatcher;
exports.OutboxDispatcher = OutboxDispatcher = OutboxDispatcher_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_service_1.NotificationService,
        outbox_service_1.OutboxService])
], OutboxDispatcher);
//# sourceMappingURL=outbox-dispatcher.service.js.map