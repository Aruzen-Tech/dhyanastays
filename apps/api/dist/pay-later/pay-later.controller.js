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
exports.PayLaterController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
const payment_service_1 = require("../payment/payment.service");
const pay_later_service_1 = require("./pay-later.service");
const pay_instalment_dto_1 = require("./dto/pay-instalment.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
let PayLaterController = class PayLaterController {
    constructor(prisma, payLater, paymentService) {
        this.prisma = prisma;
        this.payLater = payLater;
        this.paymentService = paymentService;
    }
    getPlan(user, bookingId) {
        return this.payLater.getPlanForBooking(bookingId, user.sub);
    }
    async payInstalment(user, bookingId, seq, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: { guestId: true, plan: true, status: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== user.sub)
            throw new common_1.ForbiddenException();
        if (booking.plan !== 'PAY_LATER') {
            throw new common_1.NotFoundException('Booking is not on a Pay Later plan');
        }
        return this.paymentService.initPayLaterInstalmentPayment(user.sub, bookingId, seq, dto.idempotencyKey);
    }
};
exports.PayLaterController = PayLaterController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Get)(':id/pay-later'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PayLaterController.prototype, "getPlan", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Post)(':id/pay-later/:seq/pay'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('seq', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, pay_instalment_dto_1.PayInstalmentDto]),
    __metadata("design:returntype", Promise)
], PayLaterController.prototype, "payInstalment", null);
exports.PayLaterController = PayLaterController = __decorate([
    (0, feature_gate_decorator_1.FeatureGate)('pay_later'),
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pay_later_service_1.PayLaterService,
        payment_service_1.PaymentService])
], PayLaterController);
//# sourceMappingURL=pay-later.controller.js.map