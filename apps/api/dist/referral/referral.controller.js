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
exports.ReferralController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const referral_service_1 = require("./referral.service");
const apply_referral_dto_1 = require("./dto/apply-referral.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let ReferralController = class ReferralController {
    constructor(referralService) {
        this.referralService = referralService;
    }
    getReferralInfo(user) {
        return this.referralService.getReferralInfo(user.sub);
    }
    applyReferralCode(user, dto) {
        return this.referralService.applyReferralCode(user.sub, dto.referralCode);
    }
    getCreditLedger(user) {
        return this.referralService.getCreditLedger(user.sub);
    }
};
exports.ReferralController = ReferralController;
__decorate([
    (0, common_1.Get)('referral'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReferralController.prototype, "getReferralInfo", null);
__decorate([
    (0, common_1.Post)('referral/apply'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, apply_referral_dto_1.ApplyReferralDto]),
    __metadata("design:returntype", void 0)
], ReferralController.prototype, "applyReferralCode", null);
__decorate([
    (0, common_1.Get)('credits'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReferralController.prototype, "getCreditLedger", null);
exports.ReferralController = ReferralController = __decorate([
    (0, feature_gate_decorator_1.FeatureGate)('referrals'),
    (0, common_1.Controller)('guest'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    __metadata("design:paramtypes", [referral_service_1.ReferralService])
], ReferralController);
//# sourceMappingURL=referral.controller.js.map