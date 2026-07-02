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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const feature_gate_decorator_1 = require("../decorators/feature-gate.decorator");
const feature_flag_service_1 = require("../../feature/feature-flag.service");
let FeatureGuard = class FeatureGuard {
    constructor(reflector, featureFlags) {
        this.reflector = reflector;
        this.featureFlags = featureFlags;
    }
    async canActivate(context) {
        const featureKey = this.reflector.getAllAndOverride(feature_gate_decorator_1.FEATURE_GATE_KEY, [context.getHandler(), context.getClass()]);
        if (!featureKey)
            return true;
        const enabled = await this.featureFlags.isEnabled(featureKey);
        if (!enabled) {
            throw new common_1.ServiceUnavailableException({
                statusCode: 503,
                error: 'FeatureDisabled',
                message: `This feature is currently unavailable.`,
                feature: featureKey,
            });
        }
        return true;
    }
};
exports.FeatureGuard = FeatureGuard;
exports.FeatureGuard = FeatureGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        feature_flag_service_1.FeatureFlagService])
], FeatureGuard);
//# sourceMappingURL=feature.guard.js.map