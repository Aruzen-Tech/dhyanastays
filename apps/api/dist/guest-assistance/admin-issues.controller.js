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
exports.AdminIssuesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const guest_assistance_service_1 = require("./guest-assistance.service");
const update_issue_status_dto_1 = require("./dto/update-issue-status.dto");
let AdminIssuesController = class AdminIssuesController {
    constructor(assistanceService) {
        this.assistanceService = assistanceService;
    }
    getAll(status) {
        return this.assistanceService.getAllIssues(status);
    }
    updateStatus(user, id, dto) {
        return this.assistanceService.updateIssueStatus(user.sub, 'ADMIN', id, dto);
    }
};
exports.AdminIssuesController = AdminIssuesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminIssuesController.prototype, "getAll", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_issue_status_dto_1.UpdateIssueStatusDto]),
    __metadata("design:returntype", void 0)
], AdminIssuesController.prototype, "updateStatus", null);
exports.AdminIssuesController = AdminIssuesController = __decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Controller)('admin/issues'),
    __metadata("design:paramtypes", [guest_assistance_service_1.GuestAssistanceService])
], AdminIssuesController);
//# sourceMappingURL=admin-issues.controller.js.map