"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SosModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const admin_module_1 = require("../admin/admin.module");
const notification_module_1 = require("../notification/notification.module");
const jobs_constants_1 = require("../jobs/jobs.constants");
const sos_controller_1 = require("./sos.controller");
const admin_sos_controller_1 = require("./admin-sos.controller");
const sos_service_1 = require("./sos.service");
const sos_broadcast_service_1 = require("./sos-broadcast.service");
let SosModule = class SosModule {
};
exports.SosModule = SosModule;
exports.SosModule = SosModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({ name: jobs_constants_1.QUEUE_SOS_BROADCAST }),
            admin_module_1.AdminModule,
            notification_module_1.NotificationModule,
        ],
        providers: [sos_service_1.SosService, sos_broadcast_service_1.SosBroadcastService],
        controllers: [sos_controller_1.SosController, admin_sos_controller_1.AdminSosController],
        exports: [sos_service_1.SosService, sos_broadcast_service_1.SosBroadcastService],
    })
], SosModule);
//# sourceMappingURL=sos.module.js.map