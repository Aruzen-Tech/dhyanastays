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
exports.UpsertPreferencesDto = exports.WELLNESS_OPTIONS = exports.DIETARY_OPTIONS = void 0;
const class_validator_1 = require("class-validator");
exports.DIETARY_OPTIONS = [
    'vegetarian',
    'vegan',
    'gluten-free',
    'ayurvedic',
    'jain',
    'raw',
    'no-preference',
];
exports.WELLNESS_OPTIONS = [
    'yoga',
    'meditation',
    'ayurveda',
    'detox',
    'sound-healing',
    'breathwork',
    'nature-therapy',
    'spa',
];
class UpsertPreferencesDto {
}
exports.UpsertPreferencesDto = UpsertPreferencesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpsertPreferencesDto.prototype, "dietaryNeeds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpsertPreferencesDto.prototype, "wellnessInterests", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpsertPreferencesDto.prototype, "accessibility", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['ground-floor', 'quiet-corner', 'garden-view', 'no-preference']),
    __metadata("design:type", String)
], UpsertPreferencesDto.prototype, "roomPreference", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['beginner', 'intermediate', 'advanced']),
    __metadata("design:type", String)
], UpsertPreferencesDto.prototype, "experienceLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['early-morning', 'afternoon', 'evening']),
    __metadata("design:type", String)
], UpsertPreferencesDto.prototype, "arrivalPreference", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpsertPreferencesDto.prototype, "emergencyContact", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpsertPreferencesDto.prototype, "notes", void 0);
//# sourceMappingURL=upsert-preferences.dto.js.map