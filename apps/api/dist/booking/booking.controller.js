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
exports.BookingController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const idempotency_interceptor_1 = require("../common/interceptors/idempotency.interceptor");
const booking_service_1 = require("./booking.service");
const cancel_booking_dto_1 = require("./dto/cancel-booking.dto");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const listing_service_1 = require("../listing/listing.service");
let BookingController = class BookingController {
    constructor(bookingService, listingService) {
        this.bookingService = bookingService;
        this.listingService = listingService;
    }
    create(user, dto) {
        return this.bookingService.createBooking(user.sub, dto);
    }
    getMyBookings(user) {
        return this.bookingService.getMyBookings(user.sub);
    }
    getHostBookings(user) {
        return this.bookingService.getHostBookings(user.sub);
    }
    getOne(user, id) {
        return this.bookingService.getBookingById(id, user.sub, user.role);
    }
    getPreparation(user, id) {
        return this.listingService.getPreparationForBooking(user.sub, id);
    }
    cancel(user, id, dto) {
        return this.bookingService.cancelBooking(id, user.sub, user.role, dto);
    }
    complete(user, id) {
        return this.bookingService.completeBooking(id, user.sub);
    }
    getAllBookings(page, limit, status, search) {
        return this.bookingService.getAllBookings(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50, status, search);
    }
};
exports.BookingController = BookingController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_booking_dto_1.CreateBookingDto]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getMyBookings", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST),
    (0, common_1.Get)('host'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getHostBookings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getOne", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Get)(':id/preparation'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getPreparation", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cancel_booking_dto_1.CancelBookingDto]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "cancel", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "complete", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Get)('admin/all'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getAllBookings", null);
exports.BookingController = BookingController = __decorate([
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [booking_service_1.BookingService,
        listing_service_1.ListingService])
], BookingController);
//# sourceMappingURL=booking.controller.js.map