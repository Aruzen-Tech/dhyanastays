"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModule = void 0;
const common_1 = require("@nestjs/common");
const booking_controller_1 = require("./booking.controller");
const booking_service_1 = require("./booking.service");
const state_machine_1 = require("./state-machine");
const pricing_module_1 = require("../pricing/pricing.module");
const notification_module_1 = require("../notification/notification.module");
const listing_module_1 = require("../listing/listing.module");
const referral_module_1 = require("../referral/referral.module");
const add_on_module_1 = require("../add-on/add-on.module");
const membership_module_1 = require("../membership/membership.module");
const pay_later_module_1 = require("../pay-later/pay-later.module");
let BookingModule = class BookingModule {
};
exports.BookingModule = BookingModule;
exports.BookingModule = BookingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            pricing_module_1.PricingModule,
            notification_module_1.NotificationModule,
            listing_module_1.ListingModule,
            referral_module_1.ReferralModule,
            add_on_module_1.AddOnModule,
            membership_module_1.MembershipModule,
            (0, common_1.forwardRef)(() => pay_later_module_1.PayLaterModule),
        ],
        providers: [booking_service_1.BookingService, state_machine_1.BookingStateMachine],
        controllers: [booking_controller_1.BookingController],
        exports: [booking_service_1.BookingService, state_machine_1.BookingStateMachine],
    })
], BookingModule);
//# sourceMappingURL=booking.module.js.map