"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMeiliListingDocument = toMeiliListingDocument;
function toMeiliListingDocument(listing) {
    const rateRule = listing.rateRules?.[0];
    return {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        city: listing.city,
        state: listing.state,
        country: listing.country,
        status: listing.status,
        latitude: listing.latitude,
        longitude: listing.longitude,
        experienceTags: listing.experienceTags,
        propertyType: listing.propertyType,
        dietaryOptions: listing.dietaryOptions,
        baseNightlyRate: rateRule?.baseNightlyRate ?? 0,
        maxGuests: rateRule?.maxGuests ?? 2,
        createdAt: listing.createdAt instanceof Date
            ? listing.createdAt.toISOString()
            : listing.createdAt,
    };
}
//# sourceMappingURL=meili-listing-document.js.map