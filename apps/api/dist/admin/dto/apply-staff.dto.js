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
exports.ApplyStaffDto = void 0;
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ApplyStaffDto {
}
exports.ApplyStaffDto = ApplyStaffDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'applicant@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ApplyStaffDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Jane Smith' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ApplyStaffDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AdminLevel, description: 'L1=Super Admin, L2=Ops, L3=Cluster, L4=Property, L5=Service' }),
    (0, class_validator_1.IsEnum)(client_1.AdminLevel),
    __metadata("design:type", String)
], ApplyStaffDto.prototype, "requestedLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ServiceType, description: 'Required when requestedLevel is L5' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ServiceType),
    __metadata("design:type", String)
], ApplyStaffDto.prototype, "requestedService", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cluster / region reference (L3 context)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ApplyStaffDto.prototype, "clusterId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Property reference (L4 context)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ApplyStaffDto.prototype, "propertyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Why you are applying for this role', minLength: 20, maxLength: 2000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ApplyStaffDto.prototype, "justification", void 0);
//# sourceMappingURL=apply-staff.dto.js.map