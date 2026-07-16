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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const admin_level_decorator_1 = require("../common/decorators/admin-level.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const admin_service_1 = require("./admin.service");
const admin_notification_service_1 = require("./admin-notification.service");
const rate_limit_service_1 = require("./rate-limit.service");
const create_admin_refund_dto_1 = require("./dto/create-admin-refund.dto");
const update_settings_dto_1 = require("./dto/update-settings.dto");
const bulk_ids_dto_1 = require("./dto/bulk-ids.dto");
const apply_staff_dto_1 = require("./dto/apply-staff.dto");
const review_application_dto_1 = require("./dto/review-application.dto");
const assign_staff_role_dto_1 = require("./dto/assign-staff-role.dto");
const change_user_kind_dto_1 = require("./dto/change-user-kind.dto");
let AdminController = class AdminController {
    constructor(adminService, notificationService, rateLimitService) {
        this.adminService = adminService;
        this.notificationService = notificationService;
        this.rateLimitService = rateLimitService;
    }
    getStats() {
        return this.adminService.getStats();
    }
    getUsers(page, limit, role, search) {
        return this.adminService.getUsers(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20, role, search);
    }
    changeUserKind(actor, id, dto) {
        return this.adminService.changeUserKind(id, actor.sub, dto);
    }
    getUserRoleHistory(id) {
        return this.adminService.getUserRoleHistory(id);
    }
    deactivateUser(actor, id) {
        return this.adminService.deactivateUser(id, actor.sub);
    }
    activateUser(actor, id) {
        return this.adminService.activateUser(id, actor.sub);
    }
    getAuditLog(page, limit, action, resourceType) {
        return this.adminService.getAuditLog(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 30, action, resourceType);
    }
    getRevenue(from, to, groupBy) {
        return this.adminService.getRevenueAnalytics(from, to, (groupBy || 'day'));
    }
    getListingDetail(id) {
        return this.adminService.getListingDetail(id);
    }
    validateRefundBooking(bookingId) {
        return this.adminService.validateRefundBooking(bookingId);
    }
    getRefunds(page, limit) {
        return this.adminService.getRefunds(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
    }
    createRefund(actor, dto) {
        return this.adminService.createRefund(actor.sub, dto);
    }
    getSettings() {
        return this.adminService.getSettings();
    }
    updateSettings(actor, dto) {
        return this.adminService.updateSettings(actor.sub, dto.updates);
    }
    getCalendarBookings(month, listingId) {
        return this.adminService.getCalendarBookings(month, listingId);
    }
    getHostPerformance() {
        return this.adminService.getHostPerformance();
    }
    getNotifications(unreadOnly) {
        return this.notificationService.getNotifications(unreadOnly === 'true');
    }
    markNotificationRead(id) {
        return this.notificationService.markRead(id);
    }
    markAllNotificationsRead() {
        return this.notificationService.markAllRead();
    }
    bulkApproveListings(actor, dto) {
        return this.adminService.bulkApproveListings(actor.sub, dto.ids);
    }
    bulkDeactivateUsers(actor, dto) {
        return this.adminService.bulkDeactivateUsers(actor.sub, dto.ids);
    }
    bulkCompleteBookings(actor, dto) {
        return this.adminService.bulkCompleteBookings(actor.sub, dto.ids);
    }
    globalSearch(q) {
        return this.adminService.globalSearch(q || '');
    }
    getAdminActivity(page, limit, adminId) {
        return this.adminService.getAdminActivity(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 30, adminId);
    }
    getRateLimitStats() {
        return this.rateLimitService.getStats();
    }
    getForecast() {
        return this.adminService.getRevenueForecast();
    }
    submitStaffApplication(dto, actor) {
        return this.adminService.submitApplication(dto, actor?.sub);
    }
    getApplications(status, page, limit) {
        const validStatuses = Object.values(client_1.ApplicationStatus);
        const statusFilter = validStatuses.includes(status)
            ? status
            : undefined;
        return this.adminService.getApplications(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20, statusFilter);
    }
    reviewApplication(actor, id, dto) {
        return this.adminService.reviewApplication(id, actor.sub, dto);
    }
    getStaff(search, page, limit) {
        return this.adminService.getStaff(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20, search);
    }
    assignStaffRole(actor, userId, dto) {
        return this.adminService.assignStaffRole(userId, actor.sub, dto);
    }
    revokeStaffRole(actor, userId) {
        return this.adminService.revokeStaffRole(userId, actor.sub);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Post)('users/:id/role'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, change_user_kind_dto_1.ChangeUserKindDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "changeUserKind", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1, client_1.AdminLevel.L2),
    (0, common_1.Get)('users/:id/role-history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserRoleHistory", null);
__decorate([
    (0, common_1.Post)('users/:id/deactivate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deactivateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/activate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "activateUser", null);
__decorate([
    (0, common_1.Get)('audit-log'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('resourceType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Get)('analytics/revenue'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('groupBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRevenue", null);
__decorate([
    (0, common_1.Get)('listings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getListingDetail", null);
__decorate([
    (0, common_1.Get)('refunds/validate/:bookingId'),
    __param(0, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "validateRefundBooking", null);
__decorate([
    (0, common_1.Get)('refunds'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRefunds", null);
__decorate([
    (0, common_1.Post)('refunds'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_admin_refund_dto_1.CreateAdminRefundDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createRefund", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_settings_dto_1.UpdateSettingsDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('bookings/calendar'),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('listingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCalendarBookings", null);
__decorate([
    (0, common_1.Get)('hosts/performance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getHostPerformance", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, common_1.Query)('unreadOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)('notifications/:id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "markNotificationRead", null);
__decorate([
    (0, common_1.Post)('notifications/read-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "markAllNotificationsRead", null);
__decorate([
    (0, common_1.Post)('listings/bulk-approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bulk_ids_dto_1.BulkIdsDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "bulkApproveListings", null);
__decorate([
    (0, common_1.Post)('users/bulk-deactivate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bulk_ids_dto_1.BulkIdsDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "bulkDeactivateUsers", null);
__decorate([
    (0, common_1.Post)('bookings/bulk-complete'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bulk_ids_dto_1.BulkIdsDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "bulkCompleteBookings", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "globalSearch", null);
__decorate([
    (0, common_1.Get)('activity'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('adminId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAdminActivity", null);
__decorate([
    (0, common_1.Get)('rate-limits/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRateLimitStats", null);
__decorate([
    (0, common_1.Get)('analytics/forecast'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getForecast", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('staff/apply'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [apply_staff_dto_1.ApplyStaffDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "submitStaffApplication", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Get)('staff/applications'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getApplications", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Patch)('staff/applications/:id/review'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_application_dto_1.ReviewApplicationDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reviewApplication", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Get)('staff'),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStaff", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Post)('staff/:userId/assign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_staff_role_dto_1.AssignStaffRoleDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "assignStaffRole", null);
__decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L1),
    (0, common_1.Delete)('staff/:userId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "revokeStaffRole", null);
exports.AdminController = AdminController = __decorate([
    (0, admin_level_decorator_1.AdminLevelGuard)(client_1.AdminLevel.L2),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        admin_notification_service_1.AdminNotificationService,
        rate_limit_service_1.RateLimitService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map