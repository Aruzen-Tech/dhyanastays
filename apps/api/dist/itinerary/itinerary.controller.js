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
exports.ItineraryController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const itinerary_service_1 = require("./itinerary.service");
const generate_itinerary_dto_1 = require("./dto/generate-itinerary.dto");
const suggest_itinerary_dto_1 = require("./dto/suggest-itinerary.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const feature_gate_decorator_1 = require("../common/decorators/feature-gate.decorator");
const ONE_HOUR_MS = 60 * 60 * 1000;
let ItineraryController = class ItineraryController {
    constructor(service) {
        this.service = service;
    }
    list(user) {
        return this.service.listForUser(user.sub);
    }
    usage(user) {
        return this.service.getUsage(user.sub);
    }
    suggest(user, dto) {
        return this.service.suggestConcepts(user.sub, dto);
    }
    generate(user, dto) {
        return this.service.generate(user.sub, dto);
    }
    listMessages(user, id) {
        return this.service.listMessages(user.sub, id);
    }
    sendMessage(user, id, dto) {
        return this.service.sendMessage(user.sub, id, dto.content);
    }
    getOne(user, id) {
        return this.service.getById(user.sub, id);
    }
    finalize(user, id) {
        return this.service.finalize(user.sub, id);
    }
    remove(user, id) {
        return this.service.delete(user.sub, id);
    }
};
exports.ItineraryController = ItineraryController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('usage'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "usage", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: ONE_HOUR_MS } }),
    (0, common_1.Post)('suggestions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, suggest_itinerary_dto_1.SuggestItineraryDto]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "suggest", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: ONE_HOUR_MS } }),
    (0, common_1.Post)('generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_itinerary_dto_1.GenerateItineraryDto]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "listMessages", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: ONE_HOUR_MS } }),
    (0, common_1.Post)(':id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "getOne", null);
__decorate([
    (0, common_1.Patch)(':id/finalize'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "finalize", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ItineraryController.prototype, "remove", null);
exports.ItineraryController = ItineraryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, feature_gate_decorator_1.FeatureGate)('ai_itinerary'),
    (0, common_1.Controller)('itineraries'),
    __metadata("design:paramtypes", [itinerary_service_1.ItineraryService])
], ItineraryController);
//# sourceMappingURL=itinerary.controller.js.map