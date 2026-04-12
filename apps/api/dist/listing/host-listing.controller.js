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
exports.HostListingController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const create_listing_dto_1 = require("./dto/create-listing.dto");
const update_listing_dto_1 = require("./dto/update-listing.dto");
const listing_service_1 = require("./listing.service");
let HostListingController = class HostListingController {
    constructor(listingService) {
        this.listingService = listingService;
    }
    getProfile(user) {
        return this.listingService.getHostProfile(user.sub);
    }
    getMyListings(user) {
        return this.listingService.getHostListings(user.sub);
    }
    create(user, dto) {
        return this.listingService.createHostListing(user.sub, dto);
    }
    update(user, id, dto) {
        return this.listingService.updateHostListing(user.sub, id, dto);
    }
};
exports.HostListingController = HostListingController;
__decorate([
    (0, common_1.Get)('host/profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('host/listings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getMyListings", null);
__decorate([
    (0, common_1.Post)('host/listings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_listing_dto_1.CreateListingDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('host/listings/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_listing_dto_1.UpdateListingDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "update", null);
exports.HostListingController = HostListingController = __decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [listing_service_1.ListingService])
], HostListingController);
//# sourceMappingURL=host-listing.controller.js.map