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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const init_payment_dto_1 = require("./dto/init-payment.dto");
const payment_service_1 = require("./payment.service");
const class_validator_1 = require("class-validator");
class PayBalanceDto {
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PayBalanceDto.prototype, "idempotencyKey", void 0);
let PaymentController = class PaymentController {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    init(user, dto) {
        return this.paymentService.initPayment(user.sub, dto);
    }
    webhook(req, signature) {
        const rawBody = req.rawBody?.toString('utf-8') ?? '';
        return this.paymentService.handleWebhook(rawBody, signature);
    }
    payBalance(user, bookingId, dto) {
        return this.paymentService.payBalance(user.sub, bookingId, dto.idempotencyKey);
    }
    stubConfirm(paymentId) {
        return this.paymentService.stubConfirm(paymentId);
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Post)('init'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, init_payment_dto_1.InitPaymentDto]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "init", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-razorpay-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "webhook", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Post)('bookings/:bookingId/pay-balance'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('bookingId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, PayBalanceDto]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "payBalance", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.GUEST),
    (0, common_1.Post)('stub-confirm/:paymentId'),
    __param(0, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "stubConfirm", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map