"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const admin_notification_service_1 = require("./admin-notification.service");
const rate_limit_service_1 = require("./rate-limit.service");
const booking_module_1 = require("../booking/booking.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => booking_module_1.BookingModule)],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService, admin_notification_service_1.AdminNotificationService, rate_limit_service_1.RateLimitService],
        exports: [admin_notification_service_1.AdminNotificationService, rate_limit_service_1.RateLimitService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map