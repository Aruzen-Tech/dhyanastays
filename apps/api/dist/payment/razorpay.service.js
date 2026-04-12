"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RazorpayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let RazorpayService = RazorpayService_1 = class RazorpayService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RazorpayService_1.name);
        this.keyId = this.config.get('RAZORPAY_KEY_ID', '');
        this.keySecret = this.config.get('RAZORPAY_KEY_SECRET', '');
        this.webhookSecret = this.config.get('RAZORPAY_WEBHOOK_SECRET', '');
        this.stubMode = !this.keyId || !this.keySecret;
        if (this.stubMode) {
            this.logger.warn('Razorpay credentials not configured — running in STUB mode. ' +
                'Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET in .env');
        }
    }
    isStubMode() {
        return this.stubMode;
    }
    async createOrder(amountPaise, receipt) {
        if (this.stubMode) {
            return {
                id: `stub_order_${receipt}`,
                amount: amountPaise,
                currency: 'INR',
                receipt,
            };
        }
        const body = JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt,
        });
        const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${auth}`,
            },
            body,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Razorpay createOrder failed: ${response.status} ${text}`);
        }
        return response.json();
    }
    verifyWebhookSignature(rawBody, signature) {
        if (this.stubMode) {
            this.logger.warn('Webhook signature verification skipped in stub mode');
            return true;
        }
        if (!this.webhookSecret) {
            this.logger.error('RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
            return false;
        }
        const expected = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(rawBody)
            .digest('hex');
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    }
    async createRefund(paymentId, amountPaise) {
        if (this.stubMode) {
            return { id: `stub_refund_${paymentId}_${amountPaise}` };
        }
        const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify({ amount: amountPaise }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Razorpay createRefund failed: ${response.status} ${text}`);
        }
        return response.json();
    }
};
exports.RazorpayService = RazorpayService;
exports.RazorpayService = RazorpayService = RazorpayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RazorpayService);
//# sourceMappingURL=razorpay.service.js.map