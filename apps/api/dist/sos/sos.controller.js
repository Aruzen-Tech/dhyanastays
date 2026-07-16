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
exports.SosController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const sos_service_1 = require("./sos.service");
const create_incident_dto_1 = require("./dto/create-incident.dto");
const trusted_contact_dto_1 = require("./dto/trusted-contact.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let SosController = class SosController {
    constructor(sos) {
        this.sos = sos;
    }
    createIncident(user, dto) {
        return this.sos.createIncident(user.sub, dto);
    }
    listMyIncidents(user) {
        return this.sos.listMyIncidents(user.sub);
    }
    getIncident(user, id) {
        return this.sos.getIncidentForUser(user.sub, id);
    }
    getTimeline(user, id) {
        return this.sos.getStatusTimeline(user.sub, id, 'GUEST');
    }
    listMessages(user, id) {
        return this.sos.listMessages(user.sub, id, 'GUEST');
    }
    sendMessage(user, id, body) {
        return this.sos.sendMessage(user.sub, id, 'GUEST', body?.content ?? '');
    }
    listContacts(user) {
        return this.sos.listTrustedContacts(user.sub);
    }
    createContact(user, dto) {
        return this.sos.createTrustedContact(user.sub, dto);
    }
    updateContact(user, id, dto) {
        return this.sos.updateTrustedContact(user.sub, id, dto);
    }
    deleteContact(user, id) {
        return this.sos.deleteTrustedContact(user.sub, id);
    }
};
exports.SosController = SosController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, common_1.Post)('sos'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_incident_dto_1.CreateIncidentDto]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "createIncident", null);
__decorate([
    (0, common_1.Get)('sos'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "listMyIncidents", null);
__decorate([
    (0, common_1.Get)('sos/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "getIncident", null);
__decorate([
    (0, common_1.Get)('sos/:id/timeline'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)('sos/:id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "listMessages", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    (0, common_1.Post)('sos/:id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('me/trusted-contacts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "listContacts", null);
__decorate([
    (0, common_1.Post)('me/trusted-contacts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, trusted_contact_dto_1.UpsertTrustedContactDto]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "createContact", null);
__decorate([
    (0, common_1.Put)('me/trusted-contacts/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, trusted_contact_dto_1.UpsertTrustedContactDto]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "updateContact", null);
__decorate([
    (0, common_1.Delete)('me/trusted-contacts/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SosController.prototype, "deleteContact", null);
exports.SosController = SosController = __decorate([
    (0, feature_gate_decorator_1.FeatureGate)('sos'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [sos_service_1.SosService])
], SosController);
//# sourceMappingURL=sos.controller.js.map