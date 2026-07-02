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
exports.GuestExperienceController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const experience_service_1 = require("./experience.service");
const book_experience_dto_1 = require("./dto/book-experience.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let GuestExperienceController = class GuestExperienceController {
    constructor(service) {
        this.service = service;
    }
    listBookings(user) {
        return this.service.listGuestBookings(user.sub);
    }
    book(user, id, dto) {
        return this.service.bookExperience(user.sub, id, dto);
    }
    cancel(user, id) {
        return this.service.cancelGuestBooking(user.sub, id);
    }
};
exports.GuestExperienceController = GuestExperienceController;
__decorate([
    (0, common_1.Get)('bookings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestExperienceController.prototype, "listBookings", null);
__decorate([
    (0, common_1.Post)(':id/book'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, book_experience_dto_1.BookExperienceDto]),
    __metadata("design:returntype", void 0)
], GuestExperienceController.prototype, "book", null);
__decorate([
    (0, common_1.Delete)('bookings/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestExperienceController.prototype, "cancel", null);
exports.GuestExperienceController = GuestExperienceController = __decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, feature_gate_decorator_1.FeatureGate)('experiences'),
    (0, common_1.Controller)('guest/experiences'),
    __metadata("design:paramtypes", [experience_service_1.ExperienceService])
], GuestExperienceController);
//# sourceMappingURL=guest-experience.controller.js.map