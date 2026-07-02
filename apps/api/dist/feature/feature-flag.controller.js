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
exports.PublicFeatureFlagController = exports.AdminFeatureFlagController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const feature_flag_service_1 = require("./feature-flag.service");
class ToggleFeatureDto {
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleFeatureDto.prototype, "enabled", void 0);
class BulkToggleItem {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkToggleItem.prototype, "key", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], BulkToggleItem.prototype, "enabled", void 0);
class BulkToggleDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkToggleItem),
    __metadata("design:type", Array)
], BulkToggleDto.prototype, "updates", void 0);
let AdminFeatureFlagController = class AdminFeatureFlagController {
    constructor(featureFlags) {
        this.featureFlags = featureFlags;
    }
    list() {
        return this.featureFlags.listResolved();
    }
    bulk(user, dto) {
        return this.featureFlags.setMany(user.sub, dto.updates);
    }
    toggle(user, key, dto) {
        return this.featureFlags.setEnabled(user.sub, key, dto.enabled);
    }
};
exports.AdminFeatureFlagController = AdminFeatureFlagController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFeatureFlagController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)('bulk'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, BulkToggleDto]),
    __metadata("design:returntype", void 0)
], AdminFeatureFlagController.prototype, "bulk", null);
__decorate([
    (0, common_1.Patch)(':key'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ToggleFeatureDto]),
    __metadata("design:returntype", void 0)
], AdminFeatureFlagController.prototype, "toggle", null);
exports.AdminFeatureFlagController = AdminFeatureFlagController = __decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Controller)('admin/features'),
    __metadata("design:paramtypes", [feature_flag_service_1.FeatureFlagService])
], AdminFeatureFlagController);
let PublicFeatureFlagController = class PublicFeatureFlagController {
    constructor(featureFlags) {
        this.featureFlags = featureFlags;
    }
    enabledMap() {
        return this.featureFlags.enabledMap();
    }
};
exports.PublicFeatureFlagController = PublicFeatureFlagController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicFeatureFlagController.prototype, "enabledMap", null);
exports.PublicFeatureFlagController = PublicFeatureFlagController = __decorate([
    (0, common_1.Controller)('platform/features'),
    __metadata("design:paramtypes", [feature_flag_service_1.FeatureFlagService])
], PublicFeatureFlagController);
//# sourceMappingURL=feature-flag.controller.js.map