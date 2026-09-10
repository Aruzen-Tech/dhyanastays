import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const API = 'https://api.razorpay.com';

export interface RouteLinkedAccount {
  id: string;
  status?: string;
}

export interface RouteTransfer {
  id: string;
  status: string; // created | pending | processed | failed | reversed
  amount: number;
  recipient?: string;
  on_hold?: boolean;
  on_hold_until?: number | null;
  error?: { description?: string } | null;
  failure_reason?: string | null;
  recipient_settlement_id?: string | null;
}

/**
 * Thin wrapper around the Razorpay **Route** API (marketplace split settlement).
 *
 * Route is what makes the payout model RBI-compliant: Razorpay is the
 * authorised Payment Aggregator and holds collected funds in the mandated
 * escrow account, and we merely instruct it how to split each payment to
 * KYC'd **linked accounts**. Money never pools in the platform's own account.
 *
 * Mirrors {@link RazorpayService}: native fetch, no SDK dependency, and a stub
 * mode for local dev that is refused in production.
 */
@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly stubMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET', '');
    this.stubMode = !this.keyId || !this.keySecret;

    if (this.stubMode) {
      this.logger.warn(
        'Razorpay credentials not configured — Route running in STUB mode. ' +
          'No real linked accounts or transfers will be created.',
      );
    }
  }

  isStubMode(): boolean {
    return this.stubMode;
  }

  /**
   * Create a Route linked account for a host. Razorpay performs the merchant
   * KYC required by RBI before it will settle to the account.
   */
  async createLinkedAccount(input: {
    email: string;
    phone?: string | null;
    legalName: string;
    referenceId: string;
  }): Promise<RouteLinkedAccount> {
    if (this.stubMode) {
      return { id: `acc_stub_${input.referenceId}`, status: 'created' };
    }
    return this.post<RouteLinkedAccount>('/v2/accounts', {
      email: input.email,
      phone: input.phone ?? undefined,
      type: 'route',
      reference_id: input.referenceId,
      legal_business_name: input.legalName,
      business_type: 'individual',
      profile: { category: 'travel', subcategory: 'accommodation' },
    });
  }

  /**
   * Split a captured payment to a linked account.
   *
   * `onHoldUntil` (unix seconds) keeps the money in escrow until the host has
   * earned it — we use check-in + 24h, matching the existing payout eligibility
   * rule. Razorpay releases and settles automatically at that time, which is
   * what removes the manual (and non-compliant) "mark paid" step.
   */
  async createTransfer(
    paymentId: string,
    input: {
      linkedAccountId: string;
      amountPaise: number;
      onHoldUntil?: number | null;
      notes?: Record<string, string>;
    },
  ): Promise<RouteTransfer> {
    if (this.stubMode) {
      return {
        id: `trf_stub_${paymentId}_${input.linkedAccountId}`,
        status: input.onHoldUntil ? 'created' : 'processed',
        amount: input.amountPaise,
        recipient: input.linkedAccountId,
        on_hold: !!input.onHoldUntil,
        on_hold_until: input.onHoldUntil ?? null,
      };
    }
    return this.post<RouteTransfer>(`/v1/payments/${paymentId}/transfers`, {
      account: input.linkedAccountId,
      amount: input.amountPaise,
      currency: 'INR',
      ...(input.onHoldUntil
        ? { on_hold: true, on_hold_until: input.onHoldUntil }
        : { on_hold: false }),
      notes: input.notes,
    });
  }

  /** Current state of a transfer — used by the reconciliation sweep. */
  async fetchTransfer(transferId: string): Promise<RouteTransfer> {
    if (this.stubMode) {
      return { id: transferId, status: 'processed', amount: 0 };
    }
    return this.get<RouteTransfer>(`/v1/transfers/${transferId}`);
  }

  /** Release a hold early (e.g. an admin settles a dispute in the host's favour). */
  async releaseHold(transferId: string): Promise<RouteTransfer> {
    if (this.stubMode) {
      return { id: transferId, status: 'processed', amount: 0, on_hold: false };
    }
    return this.patch<RouteTransfer>(`/v1/transfers/${transferId}`, { on_hold: false });
  }

  /**
   * Claw money back from a host after a refund. This is the piece the old
   * ledger-only "carry forward" could never actually do.
   */
  async createReversal(transferId: string, amountPaise: number): Promise<{ id: string }> {
    if (this.stubMode) {
      return { id: `rvrsl_stub_${transferId}_${amountPaise}` };
    }
    return this.post<{ id: string }>(`/v1/transfers/${transferId}/reversals`, {
      amount: amountPaise,
    });
  }

  // ── HTTP plumbing ────────────────────────────────────────────────────────
  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Razorpay Route ${method} ${path} failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private get<T>(path: string) {
    return this.request<T>('GET', path);
  }
  private post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, body);
  }
  private patch<T>(path: string, body: unknown) {
    return this.request<T>('PATCH', path, body);
  }
}
