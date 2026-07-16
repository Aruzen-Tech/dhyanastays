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
exports.GuestAssistanceController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const guest_assistance_service_1 = require("./guest-assistance.service");
const create_issue_dto_1 = require("./dto/create-issue.dto");
const check_in_dto_1 = require("./dto/check-in.dto");
const check_out_dto_1 = require("./dto/check-out.dto");
let GuestAssistanceController = class GuestAssistanceController {
    constructor(assistanceService) {
        this.assistanceService = assistanceService;
    }
    getDirections(user, id) {
        return this.assistanceService.getDirectionsForBooking(user.sub, id);
    }
    getManual(user, id) {
        return this.assistanceService.getManualForBooking(user.sub, id);
    }
    createIssue(user, id, dto) {
        return this.assistanceService.createIssue(user.sub, id, dto);
    }
    getIssues(user, id) {
        return this.assistanceService.getIssuesForBooking(user.sub, id);
    }
    checkIn(user, id, dto) {
        return this.assistanceService.checkIn(user.sub, id, dto);
    }
    checkOut(user, id, dto) {
        return this.assistanceService.checkOut(user.sub, id, dto);
    }
    getCheckInOutStatus(user, id) {
        return this.assistanceService.getCheckInOutStatus(user.sub, id);
    }
};
exports.GuestAssistanceController = GuestAssistanceController;
__decorate([
    (0, common_1.Get)(':id/directions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestAssistanceController.prototype, "getDirections", null);
__decorate([
    (0, common_1.Get)(':id/manual'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestAssistanceController.prototype, "getManual", null);
__decorate([
    (0, common_1.Post)(':id/issues'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_issue_dto_1.CreateIssueDto]),
    __metadata("design:returntype", void 0)
], GuestAssistanceController.prototype, "createIssue", null);
__decorate([
    (0, common_1.Get)(':id/issues'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestAssistanceController.prototype, "getIssues", null);
__decorate([
    (0, common_1.Post)(':id/check-in'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, check_in_dto_1.CheckInDto]),
    __metadata("design:returntype", void 0)
], GuestAssistanceController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)(':id/check-out'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, check_out_dto_1.CheckOutDto]),
    __metadata("design:returntype", void 0)
], GuestAssistanceController.prototype, "checkOut", null);
__decorate([
    (0, common_1.Get)(':id/check-in-status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestAssistanceController.prototype, "getCheckInOutStatus", null);
exports.GuestAssistanceController = GuestAssistanceController = __decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [guest_assistance_service_1.GuestAssistanceService])
], GuestAssistanceController);
//# sourceMappingURL=guest-assistance.controller.js.map