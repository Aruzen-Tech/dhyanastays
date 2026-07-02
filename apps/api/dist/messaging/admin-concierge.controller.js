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
exports.AdminConciergeController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const messaging_service_1 = require("./messaging.service");
const send_message_dto_1 = require("./dto/send-message.dto");
let AdminConciergeController = class AdminConciergeController {
    constructor(messaging) {
        this.messaging = messaging;
    }
    list(status, breached) {
        return this.messaging.listConciergeThreadsForAdmin({
            status: this.parseStatus(status),
            breachedOnly: breached === 'true',
        });
    }
    getOne(id) {
        return this.messaging.adminGetConversationById(id);
    }
    join(user, id) {
        return this.messaging.adminJoinThread(id, user.sub);
    }
    send(user, id, dto) {
        return this.messaging.sendMessage(id, user.sub, client_1.UserRole.ADMIN, dto);
    }
    parseStatus(raw) {
        if (!raw)
            return undefined;
        const upper = raw.toUpperCase();
        if (upper in client_1.ConversationStatus)
            return upper;
        return undefined;
    }
};
exports.AdminConciergeController = AdminConciergeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('breached')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminConciergeController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminConciergeController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(':id/join'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminConciergeController.prototype, "join", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", void 0)
], AdminConciergeController.prototype, "send", null);
exports.AdminConciergeController = AdminConciergeController = __decorate([
    (0, common_1.Controller)('admin/concierge'),
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1, client_1.AdminLevel.L2),
    __metadata("design:paramtypes", [messaging_service_1.MessagingService])
], AdminConciergeController);
//# sourceMappingURL=admin-concierge.controller.js.map