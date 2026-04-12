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
exports.PublicListingController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../common/decorators/public.decorator");
const listing_service_1 = require("./listing.service");
let PublicListingController = class PublicListingController {
    constructor(listingService) {
        this.listingService = listingService;
    }
    getFeed() {
        return this.listingService.getPublicListings();
    }
    getOne(id) {
        return this.listingService.getPublicListingById(id);
    }
};
exports.PublicListingController = PublicListingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "getFeed", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "getOne", null);
exports.PublicListingController = PublicListingController = __decorate([
    (0, common_1.Controller)('listings'),
    __metadata("design:paramtypes", [listing_service_1.ListingService])
], PublicListingController);
//# sourceMappingURL=public-listing.controller.js.map