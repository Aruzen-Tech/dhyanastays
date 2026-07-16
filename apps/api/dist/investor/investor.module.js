"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestorModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../notification/notification.module");
const investor_service_1 = require("./investor.service");
const investor_controller_1 = require("./investor.controller");
const admin_investor_controller_1 = require("./admin-investor.controller");
let InvestorModule = class InvestorModule {
};
exports.InvestorModule = InvestorModule;
exports.InvestorModule = InvestorModule = __decorate([
    (0, common_1.Module)({
        imports: [notification_module_1.NotificationModule],
        controllers: [investor_controller_1.InvestorController, admin_investor_controller_1.AdminInvestorController],
        providers: [investor_service_1.InvestorService],
        exports: [investor_service_1.InvestorService],
    })
], InvestorModule);
//# sourceMappingURL=investor.module.js.map