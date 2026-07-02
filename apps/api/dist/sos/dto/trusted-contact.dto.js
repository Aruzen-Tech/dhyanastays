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
exports.UpsertTrustedContactDto = void 0;
const class_validator_1 = require("class-validator");
function AtLeastOneContactChannel(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'atLeastOneContactChannel',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(_value, args) {
                    if (!args)
                        return false;
                    const obj = args.object;
                    return Boolean((obj.phone && obj.phone.length > 0) || (obj.email && obj.email.length > 0));
                },
                defaultMessage() {
                    return 'At least one of phone or email is required';
                },
            },
        });
    };
}
class UpsertTrustedContactDto {
}
exports.UpsertTrustedContactDto = UpsertTrustedContactDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpsertTrustedContactDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.phone !== undefined && o.phone !== null && o.phone !== ''),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{6,14}$/, {
        message: 'phone must be in E.164 format (e.g. +919876543210) — no spaces or dashes',
    }),
    __metadata("design:type", String)
], UpsertTrustedContactDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.email !== undefined && o.email !== null && o.email !== ''),
    (0, class_validator_1.IsEmail)({}, { message: 'email must be a valid email address' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpsertTrustedContactDto.prototype, "email", void 0);
__decorate([
    AtLeastOneContactChannel(),
    __metadata("design:type", void 0)
], UpsertTrustedContactDto.prototype, "_contactChannelCheck", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpsertTrustedContactDto.prototype, "relation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertTrustedContactDto.prototype, "primary", void 0);
//# sourceMappingURL=trusted-contact.dto.js.map