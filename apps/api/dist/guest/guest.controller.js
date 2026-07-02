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
exports.ListingReviewsController = exports.GuestController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const guest_service_1 = require("./guest.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const create_review_dto_1 = require("./dto/create-review.dto");
const upsert_preferences_dto_1 = require("./dto/upsert-preferences.dto");
let GuestController = class GuestController {
    constructor(guestService) {
        this.guestService = guestService;
    }
    getProfile(user) {
        return this.guestService.getProfile(user.sub);
    }
    updateProfile(user, dto) {
        return this.guestService.updateProfile(user.sub, dto);
    }
    getPreferences(user) {
        return this.guestService.getPreferences(user.sub);
    }
    upsertPreferences(user, dto) {
        return this.guestService.upsertPreferences(user.sub, dto);
    }
    getStats(user) {
        return this.guestService.getDashboardStats(user.sub);
    }
    getLoyaltyTier(user) {
        return this.guestService.getLoyaltyTier(user.sub);
    }
    getWishlist(user) {
        return this.guestService.getWishlist(user.sub);
    }
    addToWishlist(user, listingId) {
        return this.guestService.addToWishlist(user.sub, listingId);
    }
    removeFromWishlist(user, listingId) {
        return this.guestService.removeFromWishlist(user.sub, listingId);
    }
    isWishlisted(user, listingId) {
        return this.guestService.isWishlisted(user.sub, listingId);
    }
    createReview(user, dto) {
        return this.guestService.createReview(user.sub, dto);
    }
    getMyReviews(user) {
        return this.guestService.getMyReviews(user.sub);
    }
    getNotifications(user, unreadOnly) {
        return this.guestService.getNotifications(user.sub, unreadOnly === 'true');
    }
    getUnreadCount(user) {
        return this.guestService.getUnreadCount(user.sub);
    }
    markRead(user, id) {
        return this.guestService.markNotificationRead(user.sub, id);
    }
    markAllRead(user) {
        return this.guestService.markAllNotificationsRead(user.sub);
    }
};
exports.GuestController = GuestController;
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Put)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_preferences_dto_1.UpsertPreferencesDto]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "upsertPreferences", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('loyalty'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getLoyaltyTier", null);
__decorate([
    (0, common_1.Get)('wishlist'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Post)('wishlist/:listingId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('listingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "addToWishlist", null);
__decorate([
    (0, common_1.Delete)('wishlist/:listingId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('listingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "removeFromWishlist", null);
__decorate([
    (0, common_1.Get)('wishlist/check/:listingId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('listingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "isWishlisted", null);
__decorate([
    (0, common_1.Post)('reviews'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_review_dto_1.CreateReviewDto]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "createReview", null);
__decorate([
    (0, common_1.Get)('reviews'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getMyReviews", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('notifications/unread-count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Post)('notifications/:id/read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)('notifications/read-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "markAllRead", null);
exports.GuestController = GuestController = __decorate([
    (0, common_1.Controller)('guest'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    __metadata("design:paramtypes", [guest_service_1.GuestService])
], GuestController);
let ListingReviewsController = class ListingReviewsController {
    constructor(guestService) {
        this.guestService = guestService;
    }
    getListingReviews(id) {
        return this.guestService.getListingReviews(id);
    }
};
exports.ListingReviewsController = ListingReviewsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id/reviews'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ListingReviewsController.prototype, "getListingReviews", null);
exports.ListingReviewsController = ListingReviewsController = __decorate([
    (0, common_1.Controller)('listings'),
    __metadata("design:paramtypes", [guest_service_1.GuestService])
], ListingReviewsController);
//# sourceMappingURL=guest.controller.js.map