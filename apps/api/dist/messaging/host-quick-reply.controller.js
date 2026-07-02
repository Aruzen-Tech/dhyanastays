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
exports.HostQuickReplyController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const host_quick_reply_service_1 = require("./host-quick-reply.service");
const quick_reply_dto_1 = require("./dto/quick-reply.dto");
let HostQuickReplyController = class HostQuickReplyController {
    constructor(service) {
        this.service = service;
    }
    list(user) {
        return this.service.list(user.sub);
    }
    create(user, dto) {
        return this.service.create(user.sub, dto);
    }
    update(user, id, dto) {
        return this.service.update(user.sub, id, dto);
    }
    remove(user, id) {
        return this.service.remove(user.sub, id);
    }
};
exports.HostQuickReplyController = HostQuickReplyController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostQuickReplyController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, quick_reply_dto_1.UpsertQuickReplyDto]),
    __metadata("design:returntype", void 0)
], HostQuickReplyController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, quick_reply_dto_1.UpsertQuickReplyDto]),
    __metadata("design:returntype", void 0)
], HostQuickReplyController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostQuickReplyController.prototype, "remove", null);
exports.HostQuickReplyController = HostQuickReplyController = __decorate([
    (0, common_1.Controller)('host/quick-replies'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST),
    __metadata("design:paramtypes", [host_quick_reply_service_1.HostQuickReplyService])
], HostQuickReplyController);
//# sourceMappingURL=host-quick-reply.controller.js.map