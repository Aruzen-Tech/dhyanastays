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
exports.AdminListingController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const admin_review_dto_1 = require("./dto/admin-review.dto");
const listing_service_1 = require("./listing.service");
let AdminListingController = class AdminListingController {
    constructor(listingService) {
        this.listingService = listingService;
    }
    listPending() {
        return this.listingService.getPendingListings();
    }
    approve(user, id, dto) {
        return this.listingService.reviewListing(user.sub, id, 'approve', dto.note);
    }
    reject(user, id, dto) {
        return this.listingService.reviewListing(user.sub, id, 'reject', dto.note);
    }
    requestChanges(user, id, dto) {
        return this.listingService.reviewListing(user.sub, id, 'request_changes', dto.note);
    }
    listPendingHosts() {
        return this.listingService.getPendingHosts();
    }
    approveHost(user, id) {
        return this.listingService.reviewHost(user.sub, id, 'approve');
    }
    rejectHost(user, id) {
        return this.listingService.reviewHost(user.sub, id, 'reject');
    }
};
exports.AdminListingController = AdminListingController;
__decorate([
    (0, common_1.Get)('admin/listings/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminListingController.prototype, "listPending", null);
__decorate([
    (0, common_1.Post)('admin/listings/:id/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, admin_review_dto_1.AdminReviewDto]),
    __metadata("design:returntype", void 0)
], AdminListingController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('admin/listings/:id/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, admin_review_dto_1.AdminReviewDto]),
    __metadata("design:returntype", void 0)
], AdminListingController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('admin/listings/:id/request-changes'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, admin_review_dto_1.AdminReviewDto]),
    __metadata("design:returntype", void 0)
], AdminListingController.prototype, "requestChanges", null);
__decorate([
    (0, common_1.Get)('admin/hosts/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminListingController.prototype, "listPendingHosts", null);
__decorate([
    (0, common_1.Post)('admin/hosts/:id/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminListingController.prototype, "approveHost", null);
__decorate([
    (0, common_1.Post)('admin/hosts/:id/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminListingController.prototype, "rejectHost", null);
exports.AdminListingController = AdminListingController = __decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [listing_service_1.ListingService])
], AdminListingController);
//# sourceMappingURL=admin-listing.controller.js.map