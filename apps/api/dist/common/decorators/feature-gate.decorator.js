"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureGate = exports.FEATURE_GATE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.FEATURE_GATE_KEY = 'feature_gate';
const FeatureGate = (featureKey) => (0, common_1.SetMetadata)(exports.FEATURE_GATE_KEY, featureKey);
exports.FeatureGate = FeatureGate;
//# sourceMappingURL=feature-gate.decorator.js.map