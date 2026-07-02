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
var ExperienceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
let ExperienceService = ExperienceService_1 = class ExperienceService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.logger = new common_1.Logger(ExperienceService_1.name);
    }
    async listHostExperiences(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            throw new common_1.ForbiddenException('Host profile not found');
        return this.prisma.experience.findMany({
            where: { hostId: host.id },
            orderBy: { startsAt: 'desc' },
            include: { _count: { select: { bookings: true } } },
        });
    }
    async createHostExperience(userId, dto) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host || host.verificationStatus !== 'APPROVED') {
            throw new common_1.ForbiddenException('Host must be approved before creating experiences');
        }
        this.validateWindow(dto.startsAt, dto.endsAt);
        if (dto.listingId) {
            const listing = await this.prisma.listing.findUnique({
                where: { id: dto.listingId },
                select: { hostId: true },
            });
            if (!listing || listing.hostId !== host.id) {
                throw new common_1.ForbiddenException('Listing does not belong to host');
            }
        }
        const experience = await this.prisma.experience.create({
            data: {
                hostId: host.id,
                createdById: userId,
                listingId: dto.listingId ?? null,
                title: dto.title,
                description: dto.description,
                category: dto.category,
                city: dto.city,
                state: dto.state,
                country: dto.country ?? 'India',
                latitude: dto.latitude ?? null,
                longitude: dto.longitude ?? null,
                startsAt: new Date(dto.startsAt),
                endsAt: new Date(dto.endsAt),
                capacity: dto.capacity,
                priceMinor: dto.priceMinor,
                imageUrl: dto.imageUrl ?? null,
                status: client_1.ExperienceStatus.PENDING_APPROVAL,
            },
        });
        await this.writeAudit(userId, 'EXPERIENCE_CREATE', 'experience', experience.id, {
            title: experience.title,
        });
        return experience;
    }
    async updateHostExperience(userId, id, dto) {
        const experience = await this.getOwnedHostExperience(userId, id);
        if (dto.startsAt || dto.endsAt) {
            this.validateWindow(dto.startsAt ?? experience.startsAt.toISOString(), dto.endsAt ?? experience.endsAt.toISOString());
        }
        const updated = await this.prisma.experience.update({
            where: { id },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.category !== undefined && { category: dto.category }),
                ...(dto.city !== undefined && { city: dto.city }),
                ...(dto.state !== undefined && { state: dto.state }),
                ...(dto.country !== undefined && { country: dto.country }),
                ...(dto.latitude !== undefined && { latitude: dto.latitude }),
                ...(dto.longitude !== undefined && { longitude: dto.longitude }),
                ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
                ...(dto.endsAt && { endsAt: new Date(dto.endsAt) }),
                ...(dto.capacity !== undefined && { capacity: dto.capacity }),
                ...(dto.priceMinor !== undefined && { priceMinor: dto.priceMinor }),
                ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
                ...(experience.status === client_1.ExperienceStatus.APPROVED && {
                    status: client_1.ExperienceStatus.PENDING_APPROVAL,
                }),
            },
        });
        await this.writeAudit(userId, 'EXPERIENCE_UPDATE', 'experience', id, {});
        return updated;
    }
    async closeHostExperience(userId, id) {
        await this.getOwnedHostExperience(userId, id);
        const updated = await this.prisma.experience.update({
            where: { id },
            data: { status: client_1.ExperienceStatus.CLOSED },
        });
        await this.writeAudit(userId, 'EXPERIENCE_CLOSE', 'experience', id, {});
        return updated;
    }
    async getHostExperienceBookings(userId, id) {
        await this.getOwnedHostExperience(userId, id);
        return this.prisma.experienceBooking.findMany({
            where: { experienceId: id },
            orderBy: { createdAt: 'desc' },
            include: { guest: { select: { id: true, fullName: true, email: true } } },
        });
    }
    async listPublicExperiences(params) {
        const where = {
            status: client_1.ExperienceStatus.APPROVED,
        };
        if (params.city)
            where.city = { contains: params.city, mode: 'insensitive' };
        if (params.category)
            where.category = params.category;
        if (params.upcoming !== false) {
            where.startsAt = { gte: new Date() };
        }
        return this.prisma.experience.findMany({
            where,
            orderBy: { startsAt: 'asc' },
            take: 100,
            include: {
                host: { select: { user: { select: { fullName: true } } } },
                _count: { select: { bookings: true } },
            },
        });
    }
    async getPublicExperience(id) {
        const experience = await this.prisma.experience.findFirst({
            where: { id, status: client_1.ExperienceStatus.APPROVED },
            include: {
                host: { select: { user: { select: { fullName: true } } } },
                listing: { select: { id: true, title: true, city: true, state: true } },
            },
        });
        if (!experience)
            throw new common_1.NotFoundException('Experience not found');
        const seatsSold = await this.countSeatsSold(id);
        return {
            ...experience,
            seatsAvailable: Math.max(0, experience.capacity - seatsSold),
        };
    }
    async bookExperience(userId, id, dto) {
        const idempotencyKey = dto.idempotencyKey ?? (0, crypto_1.randomUUID)();
        const existing = await this.prisma.experienceBooking.findUnique({
            where: { idempotencyKey },
        });
        if (existing)
            return existing;
        const experience = await this.prisma.experience.findUnique({ where: { id } });
        if (!experience || experience.status !== client_1.ExperienceStatus.APPROVED) {
            throw new common_1.NotFoundException('Experience not found');
        }
        if (experience.startsAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Experience has already started');
        }
        return this.prisma.$transaction(async (tx) => {
            const confirmed = await tx.experienceBooking.aggregate({
                where: {
                    experienceId: id,
                    status: { in: [
                            client_1.ExperienceBookingStatus.HELD,
                            client_1.ExperienceBookingStatus.CONFIRMED,
                            client_1.ExperienceBookingStatus.COMPLETED,
                        ] },
                },
                _sum: { seats: true },
            });
            const used = confirmed._sum.seats ?? 0;
            if (used + dto.seats > experience.capacity) {
                throw new common_1.BadRequestException('Not enough seats available');
            }
            const totalMinor = experience.priceMinor * dto.seats;
            const booking = await tx.experienceBooking.create({
                data: {
                    experienceId: id,
                    guestId: userId,
                    seats: dto.seats,
                    totalMinor,
                    currency: experience.currency,
                    status: client_1.ExperienceBookingStatus.CONFIRMED,
                    idempotencyKey,
                },
            });
            return booking;
        });
    }
    async listGuestBookings(userId) {
        return this.prisma.experienceBooking.findMany({
            where: { guestId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                experience: {
                    select: {
                        id: true, title: true, category: true, city: true, state: true,
                        startsAt: true, endsAt: true, imageUrl: true,
                    },
                },
            },
        });
    }
    async cancelGuestBooking(userId, bookingId) {
        const booking = await this.prisma.experienceBooking.findUnique({
            where: { id: bookingId },
            include: { experience: true },
        });
        if (!booking || booking.guestId !== userId) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.status === client_1.ExperienceBookingStatus.CANCELLED ||
            booking.status === client_1.ExperienceBookingStatus.REFUNDED) {
            return booking;
        }
        if (booking.experience.startsAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Cannot cancel after start');
        }
        const updated = await this.prisma.experienceBooking.update({
            where: { id: bookingId },
            data: {
                status: client_1.ExperienceBookingStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });
        await this.writeAudit(userId, 'EXPERIENCE_CANCEL', 'experience_booking', bookingId, {});
        return updated;
    }
    async adminListExperiences(status) {
        return this.prisma.experience.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                host: { select: { user: { select: { fullName: true, email: true } } } },
                _count: { select: { bookings: true } },
            },
        });
    }
    async moderateExperience(actorUserId, id, dto) {
        const experience = await this.prisma.experience.findUnique({ where: { id } });
        if (!experience)
            throw new common_1.NotFoundException('Experience not found');
        const updated = await this.prisma.experience.update({
            where: { id },
            data: {
                status: dto.action === 'APPROVED'
                    ? client_1.ExperienceStatus.APPROVED
                    : client_1.ExperienceStatus.REJECTED,
                reviewedBy: actorUserId,
                reviewNotes: dto.notes ?? null,
                reviewedAt: new Date(),
            },
        });
        await this.writeAudit(actorUserId, `EXPERIENCE_${dto.action}`, 'experience', id, { notes: dto.notes ?? null });
        return updated;
    }
    async getOwnedHostExperience(userId, id) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            throw new common_1.ForbiddenException('Host profile not found');
        const experience = await this.prisma.experience.findUnique({ where: { id } });
        if (!experience || experience.hostId !== host.id) {
            throw new common_1.NotFoundException('Experience not found');
        }
        return experience;
    }
    validateWindow(startsAt, endsAt) {
        const start = new Date(startsAt);
        const end = new Date(endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid date');
        }
        if (end.getTime() <= start.getTime()) {
            throw new common_1.BadRequestException('endsAt must be after startsAt');
        }
        if (start.getTime() < Date.now() - 60_000) {
            throw new common_1.BadRequestException('startsAt must be in the future');
        }
    }
    async countSeatsSold(experienceId) {
        const agg = await this.prisma.experienceBooking.aggregate({
            where: {
                experienceId,
                status: { in: [
                        client_1.ExperienceBookingStatus.HELD,
                        client_1.ExperienceBookingStatus.CONFIRMED,
                        client_1.ExperienceBookingStatus.COMPLETED,
                    ] },
            },
            _sum: { seats: true },
        });
        return agg._sum.seats ?? 0;
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
exports.ExperienceService = ExperienceService;
exports.ExperienceService = ExperienceService = ExperienceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], ExperienceService);
//# sourceMappingURL=experience.service.js.map