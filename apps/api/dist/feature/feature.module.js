"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureModule = void 0;
const common_1 = require("@nestjs/common");
const feature_flag_service_1 = require("./feature-flag.service");
const feature_flag_controller_1 = require("./feature-flag.controller");
let FeatureModule = class FeatureModule {
};
exports.FeatureModule = FeatureModule;
exports.FeatureModule = FeatureModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [feature_flag_controller_1.AdminFeatureFlagController, feature_flag_controller_1.PublicFeatureFlagController],
        providers: [feature_flag_service_1.FeatureFlagService],
        exports: [feature_flag_service_1.FeatureFlagService],
    })
], FeatureModule);
//# sourceMappingURL=feature.module.js.map