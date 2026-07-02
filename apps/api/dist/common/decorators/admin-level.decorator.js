"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLevelGuard = exports.ADMIN_LEVEL_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ADMIN_LEVEL_KEY = 'adminLevels';
const AdminLevelGuard = (...levels) => (0, common_1.SetMetadata)(exports.ADMIN_LEVEL_KEY, levels);
exports.AdminLevelGuard = AdminLevelGuard;
//# sourceMappingURL=admin-level.decorator.js.map