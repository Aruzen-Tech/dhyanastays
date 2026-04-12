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
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const storage_service_1 = require("./storage.service");
let StorageController = class StorageController {
    constructor(storage) {
        this.storage = storage;
    }
    async getPresignedUrl(user, body) {
        const folder = body.folder ?? `listings/${user.sub}`;
        return this.storage.getPresignedUploadUrl(folder, body.filename, body.mimeType);
    }
    async deleteObject(user, key) {
        if (user.role === client_1.UserRole.HOST && !key.startsWith(`listings/${user.sub}/`)) {
            return { success: false, error: 'Forbidden' };
        }
        await this.storage.deleteObject(key);
        return { success: true };
    }
    stubGet(key) {
        const filename = (key ?? '').split('/').pop() ?? 'image';
        const svg = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#1a5c4a"/>
      <text x="200" y="160" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">
        ${filename}
      </text>
    </svg>`;
        return svg;
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST, client_1.UserRole.ADMIN),
    (0, common_1.Post)('presign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getPresignedUrl", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.HOST, client_1.UserRole.ADMIN),
    (0, common_1.Delete)('object'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "deleteObject", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('stub/*'),
    __param(0, (0, common_1.Param)('0')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "stubGet", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.Controller)('storage'),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map