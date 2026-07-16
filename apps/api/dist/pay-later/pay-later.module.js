"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayLaterModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../notification/notification.module");
const payment_module_1 = require("../payment/payment.module");
const pay_later_service_1 = require("./pay-later.service");
const pay_later_controller_1 = require("./pay-later.controller");
let PayLaterModule = class PayLaterModule {
};
exports.PayLaterModule = PayLaterModule;
exports.PayLaterModule = PayLaterModule = __decorate([
    (0, common_1.Module)({
        imports: [notification_module_1.NotificationModule, (0, common_1.forwardRef)(() => payment_module_1.PaymentModule)],
        controllers: [pay_later_controller_1.PayLaterController],
        providers: [pay_later_service_1.PayLaterService],
        exports: [pay_later_service_1.PayLaterService],
    })
], PayLaterModule);
//# sourceMappingURL=pay-later.module.js.map