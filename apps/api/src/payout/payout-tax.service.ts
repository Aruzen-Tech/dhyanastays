import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagService } from '../feature/feature-flag.service';

export const PAYOUT_TAX_FLAG = 'payout_tax_withholding';

export interface PayoutTax {
  /** TDS under Income-Tax §194-O, paise. */
  tds: number;
  /** TCS under CGST §52, paise. */
  tcs: number;
  /** tds + tcs, paise. */
  total: number;
  tdsRate: number;
  tcsRate: number;
}

const ZERO: PayoutTax = { tds: 0, tcs: 0, total: 0, tdsRate: 0, tcsRate: 0 };

/**
 * Tax withheld at source from a host payout, because the platform is an
 * e-commerce operator: **TDS under Income-Tax §194-O** and **TCS under CGST
 * §52** on the host's supply.
 *
 * Rates are read from config rather than hardcoded — both were revised recently
 * (194-O cut to 0.1%, GST TCS cut to 0.5%), so they belong in environment
 * config that a CA can sign off per financial year, not in the build. The whole
 * behaviour is additionally gated behind `payout_tax_withholding`, default off.
 *
 * Rounding is deliberately *up* (`Math.ceil`): under-withholding leaves the
 * platform liable for the shortfall, whereas over-withholding by at most a paisa
 * is reconciled in the host's favour at filing.
 */
@Injectable()
export class PayoutTaxService {
  private readonly tdsRate: number;
  private readonly tcsRate: number;

  constructor(
    config: ConfigService,
    private readonly features: FeatureFlagService,
  ) {
    this.tdsRate = config.get<number>('TDS_194O_RATE', 0.001);
    this.tcsRate = config.get<number>('TCS_GST_RATE', 0.005);
  }

  isEnabled(): Promise<boolean> {
    return this.features.isEnabled(PAYOUT_TAX_FLAG);
  }

  /** Compute withholding on a gross host share. Returns zeros when disabled. */
  async compute(grossPaise: number): Promise<PayoutTax> {
    if (grossPaise <= 0) return ZERO;
    if (!(await this.isEnabled())) return ZERO;
    return this.computeSync(grossPaise);
  }

  /** Rate application without the flag check — exposed for previews/reports. */
  computeSync(grossPaise: number): PayoutTax {
    if (grossPaise <= 0) return ZERO;
    const tds = Math.ceil(grossPaise * this.tdsRate);
    const tcs = Math.ceil(grossPaise * this.tcsRate);
    return { tds, tcs, total: tds + tcs, tdsRate: this.tdsRate, tcsRate: this.tcsRate };
  }

  get rates() {
    return { tdsRate: this.tdsRate, tcsRate: this.tcsRate };
  }
}
