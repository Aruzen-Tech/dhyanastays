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
exports.ChangeUserKindDto = void 0;
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ChangeUserKindDto {
}
exports.ChangeUserKindDto = ChangeUserKindDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.UserKind }),
    (0, class_validator_1.IsEnum)(client_1.UserKind),
    __metadata("design:type", String)
], ChangeUserKindDto.prototype, "kind", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minLength: 3, maxLength: 500, description: 'Reason for role change (audit trail)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ChangeUserKindDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.AdminLevel }),
    (0, class_validator_1.ValidateIf)((o) => o.kind === client_1.UserKind.STAFF),
    (0, class_validator_1.IsEnum)(client_1.AdminLevel),
    __metadata("design:type", String)
], ChangeUserKindDto.prototype, "level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ServiceType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ServiceType),
    __metadata("design:type", String)
], ChangeUserKindDto.prototype, "serviceType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ChangeUserKindDto.prototype, "clusterId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ChangeUserKindDto.prototype, "propertyId", void 0);
//# sourceMappingURL=change-user-kind.dto.js.map