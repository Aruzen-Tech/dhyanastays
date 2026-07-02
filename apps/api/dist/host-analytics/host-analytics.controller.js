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
exports.HostAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const host_analytics_service_1 = require("./host-analytics.service");
let HostAnalyticsController = class HostAnalyticsController {
    constructor(hostAnalytics) {
        this.hostAnalytics = hostAnalytics;
    }
    getStats(user) {
        return this.hostAnalytics.getStats(user.sub);
    }
    getRevenue(user, from, to, groupBy = 'day') {
        return this.hostAnalytics.getRevenue(user.sub, from, to, groupBy);
    }
    getListingPerformance(user) {
        return this.hostAnalytics.getListingPerformance(user.sub);
    }
    getForecast(user) {
        return this.hostAnalytics.getForecast(user.sub);
    }
    getCalendarBookings(user, month, listingId) {
        return this.hostAnalytics.getCalendarBookings(user.sub, month, listingId);
    }
    getBookings(user, page, limit, status) {
        return this.hostAnalytics.getBookings(user.sub, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20, status);
    }
    getNotifications(user, unreadOnly) {
        return this.hostAnalytics.getNotifications(user.sub, unreadOnly === 'true');
    }
    markNotificationRead(user, id) {
        return this.hostAnalytics.markNotificationRead(user.sub, id);
    }
    markAllNotificationsRead(user) {
        return this.hostAnalytics.markAllNotificationsRead(user.sub);
    }
};
exports.HostAnalyticsController = HostAnalyticsController;
__decorate([
    (0, common_1.Get)('host/analytics/stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('host/analytics/revenue'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('groupBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "getRevenue", null);
__decorate([
    (0, common_1.Get)('host/analytics/listing-performance'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "getListingPerformance", null);
__decorate([
    (0, common_1.Get)('host/analytics/forecast'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "getForecast", null);
__decorate([
    (0, common_1.Get)('host/bookings/calendar'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('listingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "getCalendarBookings", null);
__decorate([
    (0, common_1.Get)('host/bookings/list'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "getBookings", null);
__decorate([
    (0, common_1.Get)('host/notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)('host/notifications/:id/read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "markNotificationRead", null);
__decorate([
    (0, common_1.Post)('host/notifications/read-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HostAnalyticsController.prototype, "markAllNotificationsRead", null);
exports.HostAnalyticsController = HostAnalyticsController = __decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [host_analytics_service_1.HostAnalyticsService])
], HostAnalyticsController);
//# sourceMappingURL=host-analytics.controller.js.map