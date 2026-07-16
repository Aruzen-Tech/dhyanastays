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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBookingDto = exports.GuestDetailsDto = exports.PaymentPlanDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var PaymentPlanDto;
(function (PaymentPlanDto) {
    PaymentPlanDto["FULL"] = "FULL";
    PaymentPlanDto["DEPOSIT_50"] = "DEPOSIT_50";
    PaymentPlanDto["PAY_LATER"] = "PAY_LATER";
})(PaymentPlanDto || (exports.PaymentPlanDto = PaymentPlanDto = {}));
class GuestDetailsDto {
}
exports.GuestDetailsDto = GuestDetailsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuestDetailsDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuestDetailsDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], GuestDetailsDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GuestDetailsDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GuestDetailsDto.prototype, "estimatedArrival", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GuestDetailsDto.prototype, "specialRequests", void 0);
class CreateBookingDto {
}
exports.CreateBookingDto = CreateBookingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "holdId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PaymentPlanDto),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "plan", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.plan === PaymentPlanDto.PAY_LATER),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsIn)([3, 6, 12]),
    __metadata("design:type", Number)
], CreateBookingDto.prototype, "payLaterMonths", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "idempotencyKey", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GuestDetailsDto),
    __metadata("design:type", GuestDetailsDto)
], CreateBookingDto.prototype, "guestDetails", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "acceptedTermsAt", void 0);
//# sourceMappingURL=create-booking.dto.js.map