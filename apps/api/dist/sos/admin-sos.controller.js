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
exports.AdminSosController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const sos_service_1 = require("./sos.service");
const update_incident_dto_1 = require("./dto/update-incident.dto");
let AdminSosController = class AdminSosController {
    constructor(sos) {
        this.sos = sos;
    }
    list(status) {
        return this.sos.listIncidents(status);
    }
    metrics(windowHours) {
        const w = windowHours ? Number(windowHours) : 24;
        return this.sos.getOpsMetrics(Number.isFinite(w) && w > 0 && w <= 720 ? w : 24);
    }
    get(id) {
        return this.sos.listIncidents().then((list) => list.find((i) => i.id === id));
    }
    getTimeline(user, id) {
        return this.sos.getStatusTimeline(user.sub, id, 'ADMIN');
    }
    listMessages(user, id) {
        return this.sos.listMessages(user.sub, id, 'ADMIN');
    }
    sendMessage(user, id, body) {
        return this.sos.sendMessage(user.sub, id, 'ADMIN', body?.content ?? '');
    }
    ack(user, id, dto) {
        return this.sos.ackIncident(user.sub, id, dto);
    }
    start(user, id) {
        return this.sos.startProgress(user.sub, id);
    }
    resolve(user, id, dto) {
        return this.sos.resolveIncident(user.sub, id, dto);
    }
};
exports.AdminSosController = AdminSosController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __param(0, (0, common_1.Query)('windowHours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "metrics", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/timeline'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "listMessages", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)(':id/ack'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_incident_dto_1.AckIncidentDto]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "ack", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/resolve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_incident_dto_1.ResolveIncidentDto]),
    __metadata("design:returntype", void 0)
], AdminSosController.prototype, "resolve", null);
exports.AdminSosController = AdminSosController = __decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Controller)('admin/sos'),
    __metadata("design:paramtypes", [sos_service_1.SosService])
], AdminSosController);
//# sourceMappingURL=admin-sos.controller.js.map