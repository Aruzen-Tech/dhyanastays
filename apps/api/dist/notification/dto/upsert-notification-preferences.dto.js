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
exports.UpsertNotificationPreferencesDto = exports.QuietHoursDto = void 0;
const class_validator_1 = require("class-validator");
class QuietHoursDto {
}
exports.QuietHoursDto = QuietHoursDto;
__decorate([
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'start must be HH:mm (24h)',
    }),
    __metadata("design:type", String)
], QuietHoursDto.prototype, "start", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'end must be HH:mm (24h)',
    }),
    __metadata("design:type", String)
], QuietHoursDto.prototype, "end", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QuietHoursDto.prototype, "tz", void 0);
class UpsertNotificationPreferencesDto {
}
exports.UpsertNotificationPreferencesDto = UpsertNotificationPreferencesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpsertNotificationPreferencesDto.prototype, "channels", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", QuietHoursDto)
], UpsertNotificationPreferencesDto.prototype, "quietHours", void 0);
//# sourceMappingURL=upsert-notification-preferences.dto.js.map