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
var ListingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const meili_listing_document_1 = require("./meili-listing-document");
const MAP_LISTING_LIMIT = 200;
const SEARCH_LISTING_LIMIT = 50;
let ListingService = ListingService_1 = class ListingService {
    constructor(prisma, notificationService, config) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.config = config;
        this.logger = new common_1.Logger(ListingService_1.name);
    }
    async createHostListing(userId, dto) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host || host.verificationStatus !== 'APPROVED') {
            throw new common_1.ForbiddenException('Host must be approved before listing');
        }
        const listing = await this.prisma.$transaction(async (tx) => {
            const created = await tx.listing.create({
                data: {
                    hostId: host.id,
                    createdById: userId,
                    title: dto.title,
                    description: dto.description,
                    city: dto.city,
                    state: dto.state,
                    ...(dto.latitude !== undefined && { latitude: dto.latitude }),
                    ...(dto.longitude !== undefined && { longitude: dto.longitude }),
                    status: client_1.ListingStatus.PENDING_APPROVAL,
                },
            });
            await tx.rateRule.create({
                data: {
                    listingId: created.id,
                    baseNightlyRate: dto.baseNightlyRate,
                    maxGuests: dto.maxGuests,
                    cleaningFee: 0,
                    minNights: 1,
                },
            });
            return created;
        });
        await this.writeAudit(userId, 'LISTING_CREATE', 'listing', listing.id, {
            status: listing.status,
            baseNightlyRate: dto.baseNightlyRate,
            maxGuests: dto.maxGuests,
        });
        void this.prisma.adminNotification.create({
            data: {
                type: 'LISTING_PENDING_APPROVAL',
                title: 'New listing awaiting approval',
                message: `"${dto.title}" in ${dto.city}, ${dto.state} needs review.`,
                metadata: { listingId: listing.id, hostId: host.id },
            },
        }).catch(() => { });
        return this.prisma.listing.findUnique({
            where: { id: listing.id },
            include: { rateRules: true, media: true },
        });
    }
    async updateHostListing(userId, listingId, dto) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot edit listing you do not own');
        }
        const { baseNightlyRate, maxGuests, minNights, cleaningFee, ...listingFields } = dto;
        const hasRateChanges = [baseNightlyRate, maxGuests, minNights, cleaningFee].some((v) => v !== undefined);
        const reapprovalTriggered = this.isReapprovalTriggered(dto);
        const data = {
            ...listingFields,
            ...(reapprovalTriggered
                ? { status: client_1.ListingStatus.PENDING_APPROVAL, needsReapproval: true }
                : {}),
        };
        await this.prisma.listing.update({ where: { id: listingId }, data });
        if (hasRateChanges) {
            await this.prisma.rateRule.updateMany({
                where: { listingId },
                data: {
                    ...(baseNightlyRate !== undefined && { baseNightlyRate }),
                    ...(maxGuests !== undefined && { maxGuests }),
                    ...(minNights !== undefined && { minNights }),
                    ...(cleaningFee !== undefined && { cleaningFee }),
                },
            });
        }
        await this.writeAudit(userId, 'LISTING_UPDATE', 'listing', listingId, {
            reapprovalTriggered,
            fields: Object.keys(dto),
        });
        const updated = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { rateRules: true, media: true },
        });
        if (updated && updated.status === client_1.ListingStatus.APPROVED) {
            void this.meiliIndex(updated);
        }
        return updated;
    }
    async getHostListings(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            throw new common_1.ForbiddenException('Host profile not found');
        return this.prisma.listing.findMany({
            where: { hostId: host.id },
            include: { rateRules: true, media: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPendingListings() {
        return this.prisma.listing.findMany({
            where: { status: client_1.ListingStatus.PENDING_APPROVAL },
            include: { rateRules: true },
            orderBy: { createdAt: 'asc' },
        });
    }
    async reviewListing(actorUserId, listingId, action, note) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { rateRules: true, media: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        const status = action === 'approve'
            ? client_1.ListingStatus.APPROVED
            : action === 'reject'
                ? client_1.ListingStatus.REJECTED
                : client_1.ListingStatus.CHANGES_REQUESTED;
        const updated = await this.prisma.listing.update({
            where: { id: listingId },
            data: { status, needsReapproval: false },
        });
        await this.writeAudit(actorUserId, `LISTING_${action.toUpperCase()}`, 'listing', listingId, {
            previousStatus: listing.status,
            nextStatus: status,
            note: note ?? null,
        });
        if (action === 'approve') {
            void this.meiliIndex({ ...listing, status: client_1.ListingStatus.APPROVED });
        }
        else if (action === 'reject') {
            void this.meiliDelete(listingId);
        }
        void this.sendListingReviewNotification(listing.hostId, listingId, listing.title, action, note);
        return updated;
    }
    async getHostProfile(userId) {
        const host = await this.prisma.host.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, email: true, fullName: true, createdAt: true } },
            },
        });
        if (!host)
            throw new common_1.NotFoundException('Host profile not found');
        return host;
    }
    async getPendingHosts() {
        return this.prisma.host.findMany({
            where: { verificationStatus: 'PENDING' },
            include: {
                user: { select: { id: true, email: true, fullName: true, createdAt: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async reviewHost(actorUserId, hostId, action) {
        const host = await this.prisma.host.findUnique({ where: { id: hostId } });
        if (!host)
            throw new common_1.NotFoundException('Host not found');
        const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
        const updated = await this.prisma.host.update({
            where: { id: hostId },
            data: { verificationStatus: status },
            include: { user: { select: { id: true, email: true, fullName: true } } },
        });
        await this.writeAudit(actorUserId, `HOST_${action.toUpperCase()}`, 'host', hostId, {
            previousStatus: host.verificationStatus,
            nextStatus: status,
        });
        return updated;
    }
    async getPublicListings() {
        return this.prisma.listing.findMany({
            where: { status: client_1.ListingStatus.APPROVED },
            include: {
                rateRules: true,
                media: { orderBy: { sortOrder: 'asc' }, take: 1 },
                tags: { include: { tag: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getDiscoveryListings(params) {
        const where = {
            status: client_1.ListingStatus.APPROVED,
        };
        if (params.q?.trim()) {
            where.OR = [
                { title: { contains: params.q, mode: 'insensitive' } },
                { description: { contains: params.q, mode: 'insensitive' } },
                { city: { contains: params.q, mode: 'insensitive' } },
                { state: { contains: params.q, mode: 'insensitive' } },
            ];
        }
        if (params.city?.trim()) {
            where.city = { contains: params.city, mode: 'insensitive' };
        }
        if (params.propertyType) {
            where.propertyType = params.propertyType;
        }
        if (params.experienceTags && params.experienceTags.length > 0) {
            where.experienceTags = { hasSome: params.experienceTags };
        }
        if (params.dietaryOptions && params.dietaryOptions.length > 0) {
            where.dietaryOptions = { hasSome: params.dietaryOptions };
        }
        const listings = await this.prisma.listing.findMany({
            where,
            include: {
                rateRules: true,
                media: { orderBy: { sortOrder: 'asc' }, take: 1 },
                tags: { include: { tag: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (params.sort === 'price-asc' || params.sort === 'price-desc') {
            const asc = params.sort === 'price-asc';
            listings.sort((a, b) => {
                const pa = a.rateRules[0]?.baseNightlyRate ?? Number.MAX_SAFE_INTEGER;
                const pb = b.rateRules[0]?.baseNightlyRate ?? Number.MAX_SAFE_INTEGER;
                return asc ? pa - pb : pb - pa;
            });
        }
        return listings;
    }
    async getListingsByBounds(swLat, swLng, neLat, neLng) {
        const bounds = [swLat, swLng, neLat, neLng];
        if (!bounds.every(Number.isFinite)) {
            throw new common_1.BadRequestException('Map bounds must be valid numbers');
        }
        if (swLat < -90 ||
            swLat > 90 ||
            neLat < -90 ||
            neLat > 90 ||
            swLng < -180 ||
            swLng > 180 ||
            neLng < -180 ||
            neLng > 180) {
            throw new common_1.BadRequestException('Map bounds are outside the valid coordinate range');
        }
        if (neLat < swLat) {
            throw new common_1.BadRequestException('Map bounds must have north greater than or equal to south');
        }
        if (swLng > neLng) {
            throw new common_1.BadRequestException('Map bounds must have west less than or equal to east; antimeridian-crossing bounds are not supported by this endpoint');
        }
        return this.prisma.listing.findMany({
            where: {
                status: client_1.ListingStatus.APPROVED,
                AND: [
                    { latitude: { not: null } },
                    { latitude: { gte: swLat, lte: neLat } },
                    { longitude: { not: null } },
                    { longitude: { gte: swLng, lte: neLng } },
                ],
            },
            include: { rateRules: true, media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
            orderBy: { createdAt: 'desc' },
            take: MAP_LISTING_LIMIT,
        });
    }
    async getPublicListingById(id) {
        const listing = await this.prisma.listing.findFirst({
            where: { id, status: client_1.ListingStatus.APPROVED },
            include: {
                rateRules: true,
                media: { orderBy: { sortOrder: 'asc' } },
                seasonalRates: { orderBy: { startsAt: 'asc' } },
                host: { select: { userId: true, user: { select: { fullName: true } } } },
                tags: { include: { tag: true } },
            },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        return listing;
    }
    async searchListings(q) {
        const meiliUrl = this.config.get('MEILI_URL', '');
        const meiliKey = this.config.get('MEILI_MASTER_KEY', '');
        if (q.trim() && meiliUrl) {
            try {
                const res = await fetch(`${meiliUrl}/indexes/listings/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${meiliKey}`,
                    },
                    body: JSON.stringify({ q: q.trim(), limit: SEARCH_LISTING_LIMIT }),
                });
                if (res.ok) {
                    const data = await res.json();
                    const ids = data.hits.map((h) => h.id);
                    if (ids.length > 0) {
                        const listings = await this.prisma.listing.findMany({
                            where: {
                                id: { in: ids },
                                status: client_1.ListingStatus.APPROVED,
                            },
                            include: {
                                rateRules: true,
                                media: {
                                    orderBy: { sortOrder: 'asc' },
                                    take: 1,
                                },
                            },
                        });
                        const listingsById = new Map(listings.map((listing) => [listing.id, listing]));
                        return ids.flatMap((id) => {
                            const listing = listingsById.get(id);
                            return listing ? [listing] : [];
                        });
                    }
                }
            }
            catch (err) {
                this.logger.warn(`Meilisearch search failed, falling back to DB: ${String(err)}`);
            }
        }
        return this.prisma.listing.findMany({
            where: {
                status: client_1.ListingStatus.APPROVED,
                ...(q.trim() ? {
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { city: { contains: q, mode: 'insensitive' } },
                        { state: { contains: q, mode: 'insensitive' } },
                        { description: { contains: q, mode: 'insensitive' } },
                    ],
                } : {}),
            },
            include: { rateRules: true, media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
            orderBy: { createdAt: 'desc' },
            take: SEARCH_LISTING_LIMIT,
        });
    }
    async addMedia(userId, listingId, dto) {
        await this.verifyOwnership(userId, listingId);
        return this.prisma.listingMedia.create({
            data: { listingId, url: dto.url, mediaType: dto.mediaType, sortOrder: dto.sortOrder ?? 0 },
        });
    }
    async deleteMedia(userId, listingId, mediaId) {
        await this.verifyOwnership(userId, listingId);
        const media = await this.prisma.listingMedia.findFirst({ where: { id: mediaId, listingId } });
        if (!media)
            throw new common_1.NotFoundException('Media not found');
        await this.prisma.listingMedia.delete({ where: { id: mediaId } });
        return { deleted: true };
    }
    async addSeasonalRate(userId, listingId, dto) {
        await this.verifyOwnership(userId, listingId);
        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);
        if (endsAt <= startsAt)
            throw new common_1.BadRequestException('endsAt must be after startsAt');
        return this.prisma.seasonalRate.create({
            data: { listingId, startsAt, endsAt, nightlyRate: dto.nightlyRate },
        });
    }
    async getSeasonalRates(userId, listingId) {
        await this.verifyOwnership(userId, listingId);
        return this.prisma.seasonalRate.findMany({ where: { listingId }, orderBy: { startsAt: 'asc' } });
    }
    async deleteSeasonalRate(userId, listingId, rateId) {
        await this.verifyOwnership(userId, listingId);
        const rate = await this.prisma.seasonalRate.findFirst({ where: { id: rateId, listingId } });
        if (!rate)
            throw new common_1.NotFoundException('Seasonal rate not found');
        await this.prisma.seasonalRate.delete({ where: { id: rateId } });
        return { deleted: true };
    }
    async addAvailabilityBlock(userId, listingId, dto) {
        await this.verifyOwnership(userId, listingId);
        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);
        if (endsAt <= startsAt)
            throw new common_1.BadRequestException('endsAt must be after startsAt');
        return this.prisma.availabilityBlock.create({
            data: { listingId, startsAt, endsAt, reason: dto.reason },
        });
    }
    async getAvailabilityBlocks(userId, listingId) {
        await this.verifyOwnership(userId, listingId);
        return this.prisma.availabilityBlock.findMany({
            where: { listingId },
            orderBy: { startsAt: 'asc' },
        });
    }
    async deleteAvailabilityBlock(userId, listingId, blockId) {
        await this.verifyOwnership(userId, listingId);
        const block = await this.prisma.availabilityBlock.findFirst({ where: { id: blockId, listingId } });
        if (!block)
            throw new common_1.NotFoundException('Availability block not found');
        await this.prisma.availabilityBlock.delete({ where: { id: blockId } });
        return { deleted: true };
    }
    async getAllTags() {
        return this.prisma.tag.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    }
    async setListingTags(userId, listingId, tagIds) {
        await this.verifyOwnership(userId, listingId);
        await this.prisma.listingTag.deleteMany({ where: { listingId } });
        if (tagIds.length > 0) {
            const validTags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
            const validIds = validTags.map((t) => t.id);
            await this.prisma.listingTag.createMany({
                data: validIds.map((tagId) => ({ listingId, tagId })),
                skipDuplicates: true,
            });
        }
        return this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { tags: { include: { tag: true } }, rateRules: true },
        });
    }
    async getListingTags(listingId) {
        return this.prisma.listingTag.findMany({
            where: { listingId },
            include: { tag: true },
        });
    }
    async verifyOwnership(userId, listingId) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot modify a listing you do not own');
        }
        return listing;
    }
    async sendListingReviewNotification(hostId, listingId, listingTitle, action, note) {
        try {
            const host = await this.prisma.host.findUnique({
                where: { id: hostId },
                include: { user: { select: { fullName: true, email: true } } },
            });
            if (!host)
                return;
            if (action === 'approve') {
                await this.notificationService.sendHostListingApproved({
                    hostName: host.user.fullName,
                    hostEmail: host.user.email,
                    listingTitle,
                    listingId,
                });
                await this.prisma.hostNotification.create({
                    data: {
                        hostId,
                        type: 'LISTING_APPROVED',
                        title: 'Listing approved',
                        message: `Your listing "${listingTitle}" is now live on Dhyana Stays.`,
                        metadata: { listingId },
                    },
                });
            }
            else if (action === 'reject') {
                await this.notificationService.sendHostListingRejected({
                    hostName: host.user.fullName,
                    hostEmail: host.user.email,
                    listingTitle,
                    note,
                });
                await this.prisma.hostNotification.create({
                    data: {
                        hostId,
                        type: action === 'reject' ? 'LISTING_REJECTED' : 'LISTING_CHANGES_REQUESTED',
                        title: action === 'reject' ? 'Listing rejected' : 'Changes requested',
                        message: `Your listing "${listingTitle}" ${action === 'reject' ? 'was not approved' : 'needs changes'}.${note ? ' Note: ' + note : ''}`,
                        metadata: { listingId, note },
                    },
                });
            }
        }
        catch {
        }
    }
    async getPreparationGuide(userId, listingId) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot access listing you do not own');
        }
        return { preparationGuide: listing.preparationGuide ?? null };
    }
    async updatePreparationGuide(userId, listingId, dto) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot edit listing you do not own');
        }
        const updated = await this.prisma.listing.update({
            where: { id: listingId },
            data: { preparationGuide: dto },
            select: { id: true, preparationGuide: true },
        });
        return updated;
    }
    async getPreparationForBooking(userId, bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { listing: { select: { id: true, title: true, preparationGuide: true } } },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId) {
            throw new common_1.ForbiddenException('Not your booking');
        }
        const confirmedStatuses = ['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'COMPLETED'];
        if (!confirmedStatuses.includes(booking.status)) {
            throw new common_1.ForbiddenException('Preparation guide is available only for confirmed bookings');
        }
        return {
            bookingId: booking.id,
            listingTitle: booking.listing.title,
            preparationGuide: booking.listing.preparationGuide ?? null,
        };
    }
    async getDirections(userId, listingId) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot access listing you do not own');
        }
        return { propertyDirections: listing.propertyDirections ?? null };
    }
    async updateDirections(userId, listingId, dto) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot edit listing you do not own');
        }
        return this.prisma.listing.update({
            where: { id: listingId },
            data: { propertyDirections: dto },
            select: { id: true, propertyDirections: true },
        });
    }
    async getManual(userId, listingId) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot access listing you do not own');
        }
        return { propertyManual: listing.propertyManual ?? null };
    }
    async updateManual(userId, listingId, dto) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot edit listing you do not own');
        }
        return this.prisma.listing.update({
            where: { id: listingId },
            data: { propertyManual: dto },
            select: { id: true, propertyManual: true },
        });
    }
    isReapprovalTriggered(dto) {
        const sensitiveFields = ['city', 'state', 'country', 'description'];
        return sensitiveFields.some((field) => dto[field] !== undefined);
    }
    async writeAudit(actorUserId, action, resourceType, resourceId, metadata) {
        await this.prisma.auditLog.create({
            data: {
                actorUserId,
                action,
                resourceType,
                resourceId,
                metadata: metadata,
            },
        });
    }
    async meiliIndex(listing) {
        const meiliUrl = this.config.get('MEILI_URL', '');
        const meiliKey = this.config.get('MEILI_MASTER_KEY', '');
        if (!meiliUrl || !meiliKey)
            return;
        const doc = (0, meili_listing_document_1.toMeiliListingDocument)(listing);
        try {
            await fetch(`${meiliUrl}/indexes/listings/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${meiliKey}` },
                body: JSON.stringify([doc]),
            });
        }
        catch (err) {
            this.logger.warn(`Meilisearch index failed for listing ${listing.id}: ${String(err)}`);
        }
    }
    async meiliDelete(listingId) {
        const meiliUrl = this.config.get('MEILI_URL', '');
        const meiliKey = this.config.get('MEILI_MASTER_KEY', '');
        if (!meiliUrl || !meiliKey)
            return;
        try {
            await fetch(`${meiliUrl}/indexes/listings/documents/${listingId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${meiliKey}` },
            });
        }
        catch (err) {
            this.logger.warn(`Meilisearch delete failed for listing ${listingId}: ${String(err)}`);
        }
    }
};
exports.ListingService = ListingService;
exports.ListingService = ListingService = ListingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        config_1.ConfigService])
], ListingService);
//# sourceMappingURL=listing.service.js.map