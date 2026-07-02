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
exports.AdminExperienceController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const experience_service_1 = require("./experience.service");
const moderate_experience_dto_1 = require("./dto/moderate-experience.dto");
let AdminExperienceController = class AdminExperienceController {
    constructor(service) {
        this.service = service;
    }
    list(status) {
        return this.service.adminListExperiences(status);
    }
    moderate(user, id, dto) {
        return this.service.moderateExperience(user.sub, id, dto);
    }
};
exports.AdminExperienceController = AdminExperienceController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminExperienceController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/moderate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, moderate_experience_dto_1.ModerateExperienceDto]),
    __metadata("design:returntype", void 0)
], AdminExperienceController.prototype, "moderate", null);
exports.AdminExperienceController = AdminExperienceController = __decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.Controller)('admin/experiences'),
    __metadata("design:paramtypes", [experience_service_1.ExperienceService])
], AdminExperienceController);
//# sourceMappingURL=admin-experience.controller.js.map