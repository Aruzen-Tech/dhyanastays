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
exports.HostMessagingController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const messaging_service_1 = require("./messaging.service");
const create_conversation_dto_1 = require("./dto/create-conversation.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let HostMessagingController = class HostMessagingController {
    constructor(messagingService) {
        this.messagingService = messagingService;
    }
    list(user) {
        return this.messagingService.getConversations(user.sub);
    }
    create(user, dto) {
        return this.messagingService.startConversation(user.sub, client_1.UserRole.HOST, dto);
    }
    unreadCount(user) {
        return this.messagingService.getUnreadCount(user.sub);
    }
    getOne(user, id) {
        return this.messagingService.getConversationById(id, user.sub);
    }
    send(user, id, dto) {
        return this.messagingService.sendMessage(id, user.sub, client_1.UserRole.HOST, dto);
    }
    markRead(user, id) {
        return this.messagingService.markRead(id, user.sub);
    }
};
exports.HostMessagingController = HostMessagingController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostMessagingController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_conversation_dto_1.CreateConversationDto]),
    __metadata("design:returntype", void 0)
], HostMessagingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostMessagingController.prototype, "unreadCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostMessagingController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", void 0)
], HostMessagingController.prototype, "send", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostMessagingController.prototype, "markRead", null);
exports.HostMessagingController = HostMessagingController = __decorate([
    (0, feature_gate_decorator_1.FeatureGate)('guest_host_messaging'),
    (0, common_1.Controller)('host/conversations'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST),
    __metadata("design:paramtypes", [messaging_service_1.MessagingService])
], HostMessagingController);
//# sourceMappingURL=host-messaging.controller.js.map