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
exports.AddOnController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const public_decorator_1 = require("../common/decorators/public.decorator");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const add_on_service_1 = require("./add-on.service");
const create_add_on_dto_1 = require("./dto/create-add-on.dto");
const create_service_provider_dto_1 = require("./dto/create-service-provider.dto");
const review_add_on_dto_1 = require("./dto/review-add-on.dto");
let AddOnController = class AddOnController {
    constructor(addOnService) {
        this.addOnService = addOnService;
    }
    listForListing(listingId) {
        return this.addOnService.listPublicAddOnsForListing(listingId);
    }
    listProviders(activeOnly) {
        return this.addOnService.listServiceProviders(activeOnly === 'true');
    }
    createProvider(actor, dto) {
        return this.addOnService.createServiceProvider(actor.sub, dto);
    }
    activateProvider(actor, id) {
        return this.addOnService.setServiceProviderActive(actor.sub, id, true);
    }
    deactivateProvider(actor, id) {
        return this.addOnService.setServiceProviderActive(actor.sub, id, false);
    }
    listAdmin(status, providerId) {
        const statusFilter = status
            ? status.toUpperCase()
            : undefined;
        return this.addOnService.listAddOns({
            status: statusFilter,
            providerId,
        });
    }
    create(actor, dto) {
        return this.addOnService.createAddOn(actor.sub, dto);
    }
    approve(actor, id, dto) {
        return this.addOnService.approveAddOn(actor.sub, id, dto);
    }
    reject(actor, id, dto) {
        return this.addOnService.rejectAddOn(actor.sub, id, dto);
    }
    retire(actor, id) {
        return this.addOnService.retireAddOn(actor.sub, id);
    }
    listForBooking(bookingId) {
        return this.addOnService.getBookingAddOns(bookingId);
    }
};
exports.AddOnController = AddOnController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('listings/:id/addons'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "listForListing", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Get)('admin/service-providers'),
    __param(0, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "listProviders", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Post)('admin/service-providers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_service_provider_dto_1.CreateServiceProviderDto]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "createProvider", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Patch)('admin/service-providers/:id/activate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "activateProvider", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Patch)('admin/service-providers/:id/deactivate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "deactivateProvider", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Get)('admin/addons'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "listAdmin", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Post)('admin/addons'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_add_on_dto_1.CreateAddOnDto]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "create", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Post)('admin/addons/:id/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_add_on_dto_1.ReviewAddOnDto]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "approve", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Post)('admin/addons/:id/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_add_on_dto_1.ReviewAddOnDto]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "reject", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Post)('admin/addons/:id/retire'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "retire", null);
__decorate([
    (0, common_1.Get)('bookings/:id/addons'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AddOnController.prototype, "listForBooking", null);
exports.AddOnController = AddOnController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [add_on_service_1.AddOnService])
], AddOnController);
//# sourceMappingURL=add-on.controller.js.map