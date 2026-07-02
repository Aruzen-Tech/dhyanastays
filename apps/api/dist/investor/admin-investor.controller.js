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
exports.AdminInvestorController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const investor_service_1 = require("./investor.service");
const upsert_investment_dto_1 = require("./dto/upsert-investment.dto");
const upsert_capital_call_dto_1 = require("./dto/upsert-capital-call.dto");
const upload_investor_document_dto_1 = require("./dto/upload-investor-document.dto");
const recompute_distribution_dto_1 = require("./dto/recompute-distribution.dto");
let AdminInvestorController = class AdminInvestorController {
    constructor(service) {
        this.service = service;
    }
    listInvestments(investorUserId, listingId) {
        return this.service.listInvestmentsAdmin({ investorUserId, listingId });
    }
    createInvestment(dto, user) {
        return this.service.createInvestment(dto, user.sub);
    }
    updateInvestment(id, dto, user) {
        return this.service.updateInvestment(id, dto, user.sub);
    }
    async removeInvestment(id, user) {
        await this.service.removeInvestment(id, user.sub);
    }
    listCapitalCalls(listingId, status) {
        return this.service.listCapitalCallsAdmin({ listingId, status });
    }
    createCapitalCall(dto, user) {
        return this.service.createCapitalCall(dto, user.sub);
    }
    updateCapitalCall(id, dto, user) {
        return this.service.updateCapitalCall(id, dto, user.sub);
    }
    listDocuments(investorUserId) {
        return this.service.listDocumentsAdmin(investorUserId);
    }
    uploadDocument(dto, user) {
        return this.service.uploadDocument(dto, user.sub);
    }
    async removeDocument(id, user) {
        await this.service.removeDocument(id, user.sub);
    }
    listDistributions(period) {
        return this.service.listDistributionsAdmin({ period });
    }
    recomputeDistributions(dto, user) {
        return this.service.recomputeDistributions(dto, user.sub);
    }
    updateDistribution(id, dto, user) {
        return this.service.updateDistribution(id, dto, user.sub);
    }
};
exports.AdminInvestorController = AdminInvestorController;
__decorate([
    (0, common_1.Get)('investments'),
    __param(0, (0, common_1.Query)('investorUserId')),
    __param(1, (0, common_1.Query)('listingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "listInvestments", null);
__decorate([
    (0, common_1.Post)('investments'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_investment_dto_1.UpsertInvestmentDto, Object]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "createInvestment", null);
__decorate([
    (0, common_1.Patch)('investments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "updateInvestment", null);
__decorate([
    (0, common_1.Delete)('investments/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminInvestorController.prototype, "removeInvestment", null);
__decorate([
    (0, common_1.Get)('capital-calls'),
    __param(0, (0, common_1.Query)('listingId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "listCapitalCalls", null);
__decorate([
    (0, common_1.Post)('capital-calls'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_capital_call_dto_1.CreateCapitalCallDto, Object]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "createCapitalCall", null);
__decorate([
    (0, common_1.Patch)('capital-calls/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, upsert_capital_call_dto_1.UpdateCapitalCallDto, Object]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "updateCapitalCall", null);
__decorate([
    (0, common_1.Get)('documents'),
    __param(0, (0, common_1.Query)('investorUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Post)('documents'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upload_investor_document_dto_1.UploadInvestorDocumentDto, Object]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminInvestorController.prototype, "removeDocument", null);
__decorate([
    (0, common_1.Get)('distributions'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "listDistributions", null);
__decorate([
    (0, common_1.Post)('distributions/recompute'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [recompute_distribution_dto_1.RecomputeDistributionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "recomputeDistributions", null);
__decorate([
    (0, common_1.Patch)('distributions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, recompute_distribution_dto_1.UpdateDistributionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminInvestorController.prototype, "updateDistribution", null);
exports.AdminInvestorController = AdminInvestorController = __decorate([
    (0, common_1.Controller)('admin/investor'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1, client_1.AdminLevel.L2),
    __metadata("design:paramtypes", [investor_service_1.InvestorService])
], AdminInvestorController);
//# sourceMappingURL=admin-investor.controller.js.map