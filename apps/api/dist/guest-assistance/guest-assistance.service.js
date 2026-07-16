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
var GuestAssistanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestAssistanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const CONFIRMED_STATUSES = ['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'COMPLETED'];
let GuestAssistanceService = GuestAssistanceService_1 = class GuestAssistanceService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GuestAssistanceService_1.name);
    }
    async getDirectionsForBooking(userId, bookingId) {
        const booking = await this.getConfirmedBooking(userId, bookingId);
        return {
            bookingId: booking.id,
            listingTitle: booking.listing.title,
            propertyDirections: booking.listing.propertyDirections ?? null,
        };
    }
    async getManualForBooking(userId, bookingId) {
        const booking = await this.getConfirmedBooking(userId, bookingId);
        return {
            bookingId: booking.id,
            listingTitle: booking.listing.title,
            propertyManual: booking.listing.propertyManual ?? null,
        };
    }
    async createIssue(userId, bookingId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { listing: { include: { host: true } } },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId)
            throw new common_1.ForbiddenException('Not your booking');
        if (!CONFIRMED_STATUSES.includes(booking.status)) {
            throw new common_1.ForbiddenException('Can only report issues for confirmed bookings');
        }
        const issue = await this.prisma.guestIssue.create({
            data: {
                bookingId: booking.id,
                listingId: booking.listingId,
                guestId: userId,
                category: dto.category,
                description: dto.description,
                urgency: dto.urgency,
                photoUrl: dto.photoUrl,
            },
        });
        await this.prisma.hostNotification.create({
            data: {
                hostId: booking.listing.hostId,
                type: 'ISSUE_REPORTED',
                title: 'New Issue Reported',
                message: `A guest has reported a ${dto.category.toLowerCase()} issue for ${booking.listing.title}.`,
                metadata: { issueId: issue.id, bookingId, category: dto.category, urgency: dto.urgency ?? 'MEDIUM' },
            },
        });
        if (dto.urgency === 'URGENT') {
            await this.prisma.adminNotification.create({
                data: {
                    type: 'URGENT_ISSUE',
                    title: 'Urgent Issue Reported',
                    message: `Urgent ${dto.category.toLowerCase()} issue at ${booking.listing.title}.`,
                    metadata: { issueId: issue.id, bookingId, listingId: booking.listingId },
                },
            });
        }
        return issue;
    }
    async getIssuesForBooking(userId, bookingId) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId)
            throw new common_1.ForbiddenException('Not your booking');
        return this.prisma.guestIssue.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getIssuesForHost(userId, status) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            throw new common_1.ForbiddenException('Host profile not found');
        const where = {
            listing: { hostId: host.id },
        };
        if (status)
            where.status = status;
        return this.prisma.guestIssue.findMany({
            where,
            include: {
                listing: { select: { id: true, title: true } },
                guest: { select: { fullName: true, email: true } },
                booking: { select: { id: true, startsAt: true, endsAt: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllIssues(status) {
        const where = {};
        if (status)
            where.status = status;
        return this.prisma.guestIssue.findMany({
            where,
            include: {
                listing: { select: { id: true, title: true } },
                guest: { select: { fullName: true, email: true } },
                booking: { select: { id: true, startsAt: true, endsAt: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateIssueStatus(userId, role, issueId, dto) {
        const issue = await this.prisma.guestIssue.findUnique({
            where: { id: issueId },
            include: { listing: { include: { host: true } } },
        });
        if (!issue)
            throw new common_1.NotFoundException('Issue not found');
        if (role === 'HOST' && issue.listing.host.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot update issues for listings you do not own');
        }
        const data = {
            status: dto.status,
        };
        if (dto.hostNotes !== undefined)
            data.hostNotes = dto.hostNotes;
        if (dto.status === 'RESOLVED')
            data.resolvedAt = new Date();
        const updated = await this.prisma.guestIssue.update({
            where: { id: issueId },
            data,
        });
        await this.prisma.guestNotification.create({
            data: {
                userId: issue.guestId,
                type: 'ISSUE_STATUS_CHANGED',
                title: 'Issue Update',
                message: `Your ${issue.category.toLowerCase()} issue has been updated to ${dto.status.replace('_', ' ').toLowerCase()}.`,
                metadata: { issueId, status: dto.status },
            },
        });
        return updated;
    }
    async checkIn(userId, bookingId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { listing: { include: { host: true } } },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId)
            throw new common_1.ForbiddenException('Not your booking');
        if (!CONFIRMED_STATUSES.includes(booking.status)) {
            throw new common_1.ForbiddenException('Booking is not confirmed');
        }
        if (booking.checkInData) {
            throw new common_1.BadRequestException('Already checked in');
        }
        const now = new Date();
        const checkInDay = new Date(booking.startsAt);
        checkInDay.setHours(0, 0, 0, 0);
        if (now < checkInDay) {
            throw new common_1.BadRequestException('Check-in is not available yet');
        }
        const checkInData = {
            confirmedName: dto.confirmedName,
            arrivalTime: dto.arrivalTime,
            specialNotes: dto.specialNotes ?? null,
            checkedInAt: now.toISOString(),
        };
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { checkInData },
        });
        await this.prisma.hostNotification.create({
            data: {
                hostId: booking.listing.hostId,
                type: 'GUEST_CHECKED_IN',
                title: 'Guest Checked In',
                message: `${dto.confirmedName} has checked in at ${booking.listing.title}.`,
                metadata: { bookingId, arrivalTime: dto.arrivalTime },
            },
        });
        return updated;
    }
    async checkOut(userId, bookingId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { listing: { include: { host: true } } },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId)
            throw new common_1.ForbiddenException('Not your booking');
        if (!booking.checkInData) {
            throw new common_1.BadRequestException('Must check in before checking out');
        }
        if (booking.checkOutData) {
            throw new common_1.BadRequestException('Already checked out');
        }
        const now = new Date();
        const windowStart = new Date(booking.endsAt.getTime() - 24 * 60 * 60 * 1000);
        const windowEnd = new Date(booking.endsAt.getTime() + 24 * 60 * 60 * 1000);
        if (now < windowStart || now > windowEnd) {
            throw new common_1.BadRequestException('Check-out is only available within 24 hours of your departure date');
        }
        const checkOutData = {
            feedback: dto.feedback ?? null,
            conditionNotes: dto.conditionNotes ?? null,
            checkedOutAt: now.toISOString(),
        };
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { checkOutData },
        });
        await this.prisma.hostNotification.create({
            data: {
                hostId: booking.listing.hostId,
                type: 'GUEST_CHECKED_OUT',
                title: 'Guest Checked Out',
                message: `Your guest has checked out from ${booking.listing.title}.`,
                metadata: { bookingId },
            },
        });
        return updated;
    }
    async getCheckInOutStatus(userId, bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId)
            throw new common_1.ForbiddenException('Not your booking');
        const now = new Date();
        const checkInDay = new Date(booking.startsAt);
        checkInDay.setHours(0, 0, 0, 0);
        const windowStart = new Date(booking.endsAt.getTime() - 24 * 60 * 60 * 1000);
        const windowEnd = new Date(booking.endsAt.getTime() + 24 * 60 * 60 * 1000);
        return {
            bookingId: booking.id,
            checkInData: booking.checkInData ?? null,
            checkOutData: booking.checkOutData ?? null,
            canCheckIn: !booking.checkInData && CONFIRMED_STATUSES.includes(booking.status) && now >= checkInDay,
            canCheckOut: !!booking.checkInData && !booking.checkOutData && now >= windowStart && now <= windowEnd,
        };
    }
    async getConfirmedBooking(userId, bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        propertyDirections: true,
                        propertyManual: true,
                    },
                },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId)
            throw new common_1.ForbiddenException('Not your booking');
        if (!CONFIRMED_STATUSES.includes(booking.status)) {
            throw new common_1.ForbiddenException('Available only for confirmed bookings');
        }
        return booking;
    }
};
exports.GuestAssistanceService = GuestAssistanceService;
exports.GuestAssistanceService = GuestAssistanceService = GuestAssistanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GuestAssistanceService);
//# sourceMappingURL=guest-assistance.service.js.map