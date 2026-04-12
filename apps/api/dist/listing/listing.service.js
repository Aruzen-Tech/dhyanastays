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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
let ListingService = class ListingService {
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
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
        return this.prisma.listing.findUnique({
            where: { id: listing.id },
            include: { rateRules: true },
        });
    }
    async updateHostListing(userId, listingId, dto) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
            include: { host: true },
        });
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot edit listing you do not own');
        }
        const reapprovalTriggered = this.isReapprovalTriggered(dto);
        const data = {
            ...dto,
            ...(reapprovalTriggered
                ? { status: client_1.ListingStatus.PENDING_APPROVAL, needsReapproval: true }
                : {}),
        };
        const updated = await this.prisma.listing.update({
            where: { id: listingId },
            data,
        });
        await this.writeAudit(userId, 'LISTING_UPDATE', 'listing', listingId, {
            reapprovalTriggered,
            fields: Object.keys(dto),
        });
        return updated;
    }
    async getHostListings(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            throw new common_1.ForbiddenException('Host profile not found');
        return this.prisma.listing.findMany({
            where: { hostId: host.id },
            include: { rateRules: true },
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
        });
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        const status = action === 'approve'
            ? client_1.ListingStatus.APPROVED
            : action === 'reject'
                ? client_1.ListingStatus.REJECTED
                : client_1.ListingStatus.CHANGES_REQUESTED;
        const updated = await this.prisma.listing.update({
            where: { id: listingId },
            data: {
                status,
                needsReapproval: false,
            },
        });
        await this.writeAudit(actorUserId, `LISTING_${action.toUpperCase()}`, 'listing', listingId, {
            previousStatus: listing.status,
            nextStatus: status,
            note: note ?? null,
        });
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
            include: {
                user: { select: { id: true, email: true, fullName: true } },
            },
        });
        await this.writeAudit(actorUserId, `HOST_${action.toUpperCase()}`, 'host', hostId, {
            previousStatus: host.verificationStatus,
            nextStatus: status,
        });
        return updated;
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
            }
            else if (action === 'reject') {
                await this.notificationService.sendHostListingRejected({
                    hostName: host.user.fullName,
                    hostEmail: host.user.email,
                    listingTitle,
                    note,
                });
            }
        }
        catch {
        }
    }
    async getPublicListings() {
        return this.prisma.listing.findMany({
            where: { status: client_1.ListingStatus.APPROVED },
            include: { rateRules: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPublicListingById(id) {
        const listing = await this.prisma.listing.findFirst({
            where: { id, status: client_1.ListingStatus.APPROVED },
            include: { rateRules: true },
        });
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        return listing;
    }
    isReapprovalTriggered(dto) {
        const sensitiveFields = [
            'city',
            'state',
            'country',
            'description',
        ];
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
};
exports.ListingService = ListingService;
exports.ListingService = ListingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], ListingService);
//# sourceMappingURL=listing.service.js.map