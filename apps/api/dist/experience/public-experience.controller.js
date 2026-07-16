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
exports.PublicExperienceController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../common/decorators/public.decorator");
const experience_service_1 = require("./experience.service");
const create_experience_dto_1 = require("./dto/create-experience.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let PublicExperienceController = class PublicExperienceController {
    constructor(service) {
        this.service = service;
    }
    list(city, category) {
        return this.service.listPublicExperiences({ city, category, upcoming: true });
    }
    categories() {
        return { categories: create_experience_dto_1.EXPERIENCE_CATEGORIES };
    }
    getOne(id) {
        return this.service.getPublicExperience(id);
    }
};
exports.PublicExperienceController = PublicExperienceController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('city')),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicExperienceController.prototype, "list", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('meta/categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicExperienceController.prototype, "categories", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicExperienceController.prototype, "getOne", null);
exports.PublicExperienceController = PublicExperienceController = __decorate([
    (0, feature_gate_decorator_1.FeatureGate)('experiences'),
    (0, common_1.Controller)('experiences'),
    __metadata("design:paramtypes", [experience_service_1.ExperienceService])
], PublicExperienceController);
//# sourceMappingURL=public-experience.controller.js.map