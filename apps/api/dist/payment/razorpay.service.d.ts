import { ConfigService } from '@nestjs/config';
export interface RazorpayOrder {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
}
export declare class RazorpayService {
    private readonly config;
    private readonly logger;
    private readonly keyId;
    private readonly keySecret;
    private readonly webhookSecret;
    private readonly stubMode;
    constructor(config: ConfigService);
    isStubMode(): boolean;
    createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder>;
    verifyWebhookSignature(rawBody: string, signature: string): boolean;
    createRefund(paymentId: string, amountPaise: number): Promise<{
        id: string;
    }>;
}
