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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestConciergeController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const messaging_service_1 = require("./messaging.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let GuestConciergeController = class GuestConciergeController {
    constructor(messaging) {
        this.messaging = messaging;
    }
    getThread(user, bookingId) {
        return this.messaging.getConciergeThreadForGuest(bookingId, user.sub);
    }
    async send(user, bookingId, dto) {
        const thread = await this.messaging.getConciergeThreadForGuest(bookingId, user.sub);
        return this.messaging.sendMessage(thread.id, user.sub, client_1.UserRole.GUEST, dto);
    }
    async markRead(user, bookingId) {
        const thread = await this.messaging.getConciergeThreadForGuest(bookingId, user.sub);
        return this.messaging.markRead(thread.id, user.sub);
    }
};
exports.GuestConciergeController = GuestConciergeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestConciergeController.prototype, "getThread", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('bookingId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], GuestConciergeController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GuestConciergeController.prototype, "markRead", null);
exports.GuestConciergeController = GuestConciergeController = __decorate([
    (0, feature_gate_decorator_1.FeatureGate)('concierge_chat'),
    (0, common_1.Controller)('bookings/:bookingId/chat'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    __metadata("design:paramtypes", [messaging_service_1.MessagingService])
], GuestConciergeController);
//# sourceMappingURL=guest-concierge.controller.js.map