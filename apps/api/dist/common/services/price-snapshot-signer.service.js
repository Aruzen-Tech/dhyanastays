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
exports.PriceSnapshotSignerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
let PriceSnapshotSignerService = class PriceSnapshotSignerService {
    constructor(config) {
        this.secret = config.get('PRICE_SNAPSHOT_SECRET', 'dev-snapshot-secret-min-32-characters!');
    }
    sign(snapshot) {
        const payload = this.canonicalize(snapshot);
        return (0, crypto_1.createHmac)('sha256', this.secret).update(payload).digest('hex');
    }
    verify(snapshot, hmac) {
        const expected = this.sign(snapshot);
        if (expected.length !== hmac.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(Buffer.from(expected), Buffer.from(hmac));
    }
    canonicalize(snapshot) {
        const fields = [
            'listingId',
            'checkIn',
            'checkOut',
            'nights',
            'guests',
            'subtotal',
            'cleaningFee',
            'platformFee',
            'addOnsTotal',
            'gstRate',
            'gstAmount',
            'total',
            'depositAmount',
            'balanceAmount',
            'currency',
            'snapshotAt',
            'expiresAt',
        ];
        const parts = fields.map((f) => `${f}=${JSON.stringify(snapshot[f] ?? '')}`);
        const addOns = Array.isArray(snapshot.addOns) ? snapshot.addOns : [];
        const addOnDigest = addOns
            .map((a) => {
            const o = a;
            return `${o.addOnId}:${o.quantity}:${o.unitPrice}:${o.totalPrice}`;
        })
            .sort()
            .join(',');
        parts.push(`addOns=${addOnDigest}`);
        return parts.join('|');
    }
};
exports.PriceSnapshotSignerService = PriceSnapshotSignerService;
exports.PriceSnapshotSignerService = PriceSnapshotSignerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PriceSnapshotSignerService);
//# sourceMappingURL=price-snapshot-signer.service.js.map