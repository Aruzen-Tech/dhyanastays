"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const messaging_service_1 = require("./messaging.service");
const guest_messaging_controller_1 = require("./guest-messaging.controller");
const host_messaging_controller_1 = require("./host-messaging.controller");
const admin_messaging_controller_1 = require("./admin-messaging.controller");
const guest_concierge_controller_1 = require("./guest-concierge.controller");
const host_concierge_controller_1 = require("./host-concierge.controller");
const admin_concierge_controller_1 = require("./admin-concierge.controller");
const host_quick_reply_controller_1 = require("./host-quick-reply.controller");
const host_quick_reply_service_1 = require("./host-quick-reply.service");
const notification_module_1 = require("../notification/notification.module");
const admin_module_1 = require("../admin/admin.module");
const host_settings_module_1 = require("../host-settings/host-settings.module");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [notification_module_1.NotificationModule, admin_module_1.AdminModule, host_settings_module_1.HostSettingsModule],
        controllers: [
            guest_messaging_controller_1.GuestMessagingController,
            host_messaging_controller_1.HostMessagingController,
            admin_messaging_controller_1.AdminMessagingController,
            guest_concierge_controller_1.GuestConciergeController,
            host_concierge_controller_1.HostConciergeController,
            admin_concierge_controller_1.AdminConciergeController,
            host_quick_reply_controller_1.HostQuickReplyController,
        ],
        providers: [messaging_service_1.MessagingService, host_quick_reply_service_1.HostQuickReplyService],
        exports: [messaging_service_1.MessagingService],
    })
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map