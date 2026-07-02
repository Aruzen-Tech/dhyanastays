"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceModule = void 0;
const common_1 = require("@nestjs/common");
const experience_service_1 = require("./experience.service");
const host_experience_controller_1 = require("./host-experience.controller");
const public_experience_controller_1 = require("./public-experience.controller");
const guest_experience_controller_1 = require("./guest-experience.controller");
const admin_experience_controller_1 = require("./admin-experience.controller");
const notification_module_1 = require("../notification/notification.module");
let ExperienceModule = class ExperienceModule {
};
exports.ExperienceModule = ExperienceModule;
exports.ExperienceModule = ExperienceModule = __decorate([
    (0, common_1.Module)({
        imports: [notification_module_1.NotificationModule],
        providers: [experience_service_1.ExperienceService],
        controllers: [
            host_experience_controller_1.HostExperienceController,
            public_experience_controller_1.PublicExperienceController,
            guest_experience_controller_1.GuestExperienceController,
            admin_experience_controller_1.AdminExperienceController,
        ],
        exports: [experience_service_1.ExperienceService],
    })
], ExperienceModule);
//# sourceMappingURL=experience.module.js.map