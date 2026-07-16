"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kinds = exports.KINDS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.KINDS_KEY = 'kinds';
const Kinds = (...kinds) => (0, common_1.SetMetadata)(exports.KINDS_KEY, kinds);
exports.Kinds = Kinds;
//# sourceMappingURL=kinds.decorator.js.map