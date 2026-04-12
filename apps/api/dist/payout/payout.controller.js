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
exports.PayoutController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const payout_service_1 = require("./payout.service");
const class_validator_1 = require("class-validator");
class MarkBatchPaidDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarkBatchPaidDto.prototype, "batchId", void 0);
let PayoutController = class PayoutController {
    constructor(payoutService) {
        this.payoutService = payoutService;
    }
    getEligible() {
        return this.payoutService.getEligibleLines();
    }
    runWeekly(user) {
        return this.payoutService.runWeeklyBatch(user.sub);
    }
    markPaid(user, id) {
        return this.payoutService.markBatchPaid(id, user.sub);
    }
    getBatches() {
        return this.payoutService.getBatches();
    }
    getStatements(user) {
        return this.payoutService.getHostStatements(user.sub);
    }
};
exports.PayoutController = PayoutController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.Get)('admin/payouts/eligible'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PayoutController.prototype, "getEligible", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.Post)('admin/payouts/run-weekly'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PayoutController.prototype, "runWeekly", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.Post)('admin/payouts/batches/:id/mark-paid'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PayoutController.prototype, "markPaid", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.Get)('admin/payouts/batches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PayoutController.prototype, "getBatches", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST),
    (0, common_1.Get)('host/payouts/statements'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PayoutController.prototype, "getStatements", null);
exports.PayoutController = PayoutController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [payout_service_1.PayoutService])
], PayoutController);
//# sourceMappingURL=payout.controller.js.map