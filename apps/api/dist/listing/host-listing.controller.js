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
const update_preparation_dto_1 = require("./dto/update-preparation.dto");
const update_directions_dto_1 = require("../guest-assistance/dto/update-directions.dto");
const update_manual_dto_1 = require("../guest-assistance/dto/update-manual.dto");
const add_media_dto_1 = require("./dto/add-media.dto");
const add_seasonal_rate_dto_1 = require("./dto/add-seasonal-rate.dto");
const add_availability_block_dto_1 = require("./dto/add-availability-block.dto");
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
    getPreparation(user, id) {
        return this.listingService.getPreparationGuide(user.sub, id);
    }
    updatePreparation(user, id, dto) {
        return this.listingService.updatePreparationGuide(user.sub, id, dto);
    }
    getDirections(user, id) {
        return this.listingService.getDirections(user.sub, id);
    }
    updateDirections(user, id, dto) {
        return this.listingService.updateDirections(user.sub, id, dto);
    }
    getManual(user, id) {
        return this.listingService.getManual(user.sub, id);
    }
    updateManual(user, id, dto) {
        return this.listingService.updateManual(user.sub, id, dto);
    }
    addMedia(user, id, dto) {
        return this.listingService.addMedia(user.sub, id, dto);
    }
    deleteMedia(user, id, mediaId) {
        return this.listingService.deleteMedia(user.sub, id, mediaId);
    }
    getAllTags() {
        return this.listingService.getAllTags();
    }
    getListingTags(id) {
        return this.listingService.getListingTags(id);
    }
    setListingTags(user, id, body) {
        return this.listingService.setListingTags(user.sub, id, body.tagIds ?? []);
    }
    addSeasonalRate(user, id, dto) {
        return this.listingService.addSeasonalRate(user.sub, id, dto);
    }
    getSeasonalRates(user, id) {
        return this.listingService.getSeasonalRates(user.sub, id);
    }
    deleteSeasonalRate(user, id, rateId) {
        return this.listingService.deleteSeasonalRate(user.sub, id, rateId);
    }
    addAvailabilityBlock(user, id, dto) {
        return this.listingService.addAvailabilityBlock(user.sub, id, dto);
    }
    getAvailabilityBlocks(user, id) {
        return this.listingService.getAvailabilityBlocks(user.sub, id);
    }
    deleteAvailabilityBlock(user, id, blockId) {
        return this.listingService.deleteAvailabilityBlock(user.sub, id, blockId);
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
__decorate([
    (0, common_1.Get)('host/listings/:id/preparation'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getPreparation", null);
__decorate([
    (0, common_1.Patch)('host/listings/:id/preparation'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_preparation_dto_1.UpdatePreparationDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "updatePreparation", null);
__decorate([
    (0, common_1.Get)('host/listings/:id/directions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getDirections", null);
__decorate([
    (0, common_1.Patch)('host/listings/:id/directions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_directions_dto_1.UpdateDirectionsDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "updateDirections", null);
__decorate([
    (0, common_1.Get)('host/listings/:id/manual'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getManual", null);
__decorate([
    (0, common_1.Patch)('host/listings/:id/manual'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_manual_dto_1.UpdateManualDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "updateManual", null);
__decorate([
    (0, common_1.Post)('host/listings/:id/media'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, add_media_dto_1.AddMediaDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "addMedia", null);
__decorate([
    (0, common_1.Delete)('host/listings/:id/media/:mediaId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('mediaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "deleteMedia", null);
__decorate([
    (0, common_1.Get)('host/tags'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getAllTags", null);
__decorate([
    (0, common_1.Get)('host/listings/:id/tags'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getListingTags", null);
__decorate([
    (0, common_1.Post)('host/listings/:id/tags'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "setListingTags", null);
__decorate([
    (0, common_1.Post)('host/listings/:id/seasonal-rates'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, add_seasonal_rate_dto_1.AddSeasonalRateDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "addSeasonalRate", null);
__decorate([
    (0, common_1.Get)('host/listings/:id/seasonal-rates'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getSeasonalRates", null);
__decorate([
    (0, common_1.Delete)('host/listings/:id/seasonal-rates/:rateId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('rateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "deleteSeasonalRate", null);
__decorate([
    (0, common_1.Post)('host/listings/:id/availability-blocks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, add_availability_block_dto_1.AddAvailabilityBlockDto]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "addAvailabilityBlock", null);
__decorate([
    (0, common_1.Get)('host/listings/:id/availability-blocks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "getAvailabilityBlocks", null);
__decorate([
    (0, common_1.Delete)('host/listings/:id/availability-blocks/:blockId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('blockId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], HostListingController.prototype, "deleteAvailabilityBlock", null);
exports.HostListingController = HostListingController = __decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [listing_service_1.ListingService])
], HostListingController);
//# sourceMappingURL=host-listing.controller.js.map