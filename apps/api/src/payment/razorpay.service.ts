import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

/**
 * Thin wrapper around Razorpay REST API.
 * Uses native fetch (Node 18+) to avoid requiring the razorpay SDK at compile time.
 * Falls back to stub mode when credentials are not configured (dev/test).
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly stubMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET', '');
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
    this.stubMode = !this.keyId || !this.keySecret;

    if (this.stubMode) {
      const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
      if (nodeEnv === 'production') {
        throw new Error(
          'Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are required in production',
        );
      }
      this.logger.warn(
        'Razorpay credentials not configured - running in STUB mode. ' +
          'Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET in .env',
      );
    }
  }

  /** Returns true when running without real Razorpay credentials (local dev). */
  isStubMode(): boolean {
    return this.stubMode;
  }

  /**
   * Create a Razorpay order.
   * @param amountPaise Amount in paise (INR × 100)
   * @param receipt     Unique receipt string (booking/payment id)
   */
  async createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
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

    return response.json() as Promise<RazorpayOrder>;
  }

  /**
   * Verify Razorpay webhook signature.
   * Razorpay signs the raw body with HMAC-SHA256 using the webhook secret.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (this.stubMode) {
      this.logger.warn('Webhook signature verification skipped in stub mode');
      return true;
    }
    if (!this.webhookSecret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET not set - rejecting webhook');
      return false;
    }
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  }

  /**
   * Initiate a refund via Razorpay.
   * @param paymentId   Razorpay payment_id
   * @param amountPaise Amount to refund in paise
   */
  async createRefund(
    paymentId: string,
    amountPaise: number,
  ): Promise<{ id: string }> {
    if (this.stubMode) {
      return { id: `stub_refund_${paymentId}_${amountPaise}` };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${paymentId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ amount: amountPaise }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Razorpay createRefund failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<{ id: string }>;
  }
}
