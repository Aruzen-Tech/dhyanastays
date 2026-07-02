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
exports.InvestorController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const kinds_decorator_1 = require("../common/decorators/kinds.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const investor_service_1 = require("./investor.service");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let InvestorController = class InvestorController {
    constructor(service) {
        this.service = service;
    }
    portfolio(user) {
        return this.service.getPortfolio(user.sub);
    }
    distributions(user, from, to) {
        return this.service.listDistributions(user.sub, { from, to });
    }
    capitalCalls(user) {
        return this.service.listCapitalCallsForInvestor(user.sub);
    }
    documents(user) {
        return this.service.listDocuments(user.sub);
    }
};
exports.InvestorController = InvestorController;
__decorate([
    (0, common_1.Get)('portfolio'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvestorController.prototype, "portfolio", null);
__decorate([
    (0, common_1.Get)('distributions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], InvestorController.prototype, "distributions", null);
__decorate([
    (0, common_1.Get)('capital-calls'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvestorController.prototype, "capitalCalls", null);
__decorate([
    (0, common_1.Get)('documents'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvestorController.prototype, "documents", null);
exports.InvestorController = InvestorController = __decorate([
    (0, feature_gate_decorator_1.FeatureGate)('investor_dashboard'),
    (0, common_1.Controller)('investor'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, kinds_decorator_1.Kinds)(client_1.UserKind.INVESTOR),
    __metadata("design:paramtypes", [investor_service_1.InvestorService])
], InvestorController);
//# sourceMappingURL=investor.controller.js.map