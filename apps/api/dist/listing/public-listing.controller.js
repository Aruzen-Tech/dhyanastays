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
const update_listing_dto_1 = require("./dto/update-listing.dto");
let PublicListingController = class PublicListingController {
    constructor(listingService) {
        this.listingService = listingService;
    }
    getFeed(q, city, experienceTags, propertyType, dietaryOptions, sort) {
        const hasFacets = q || city || experienceTags || propertyType || dietaryOptions || sort;
        if (!hasFacets) {
            return this.listingService.getPublicListings();
        }
        const parseCsv = (v) => v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        return this.listingService.getDiscoveryListings({
            q,
            city,
            experienceTags: parseCsv(experienceTags),
            propertyType,
            dietaryOptions: parseCsv(dietaryOptions),
            sort,
        });
    }
    search(q = '') {
        return this.listingService.searchListings(q);
    }
    getByBounds(swLat, swLng, neLat, neLng) {
        return this.listingService.getListingsByBounds(parseFloat(swLat), parseFloat(swLng), parseFloat(neLat), parseFloat(neLng));
    }
    getOne(id) {
        return this.listingService.getPublicListingById(id);
    }
    getAllTags() {
        return this.listingService.getAllTags();
    }
    getFacetVocabulary() {
        return {
            experienceTags: update_listing_dto_1.EXPERIENCE_TAGS,
            propertyTypes: update_listing_dto_1.PROPERTY_TYPES,
            dietaryOptions: update_listing_dto_1.DIETARY_OPTIONS,
        };
    }
};
exports.PublicListingController = PublicListingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('city')),
    __param(2, (0, common_1.Query)('experienceTags')),
    __param(3, (0, common_1.Query)('propertyType')),
    __param(4, (0, common_1.Query)('dietaryOptions')),
    __param(5, (0, common_1.Query)('sort')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "getFeed", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "search", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('map'),
    __param(0, (0, common_1.Query)('swLat')),
    __param(1, (0, common_1.Query)('swLng')),
    __param(2, (0, common_1.Query)('neLat')),
    __param(3, (0, common_1.Query)('neLng')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "getByBounds", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "getOne", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('meta/tags'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "getAllTags", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('meta/facets'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicListingController.prototype, "getFacetVocabulary", null);
exports.PublicListingController = PublicListingController = __decorate([
    (0, common_1.Controller)('listings'),
    __metadata("design:paramtypes", [listing_service_1.ListingService])
], PublicListingController);
//# sourceMappingURL=public-listing.controller.js.map