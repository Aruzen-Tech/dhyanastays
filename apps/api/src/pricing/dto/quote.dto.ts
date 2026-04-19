import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddOnSelectionDto } from '../../add-on/dto/add-on-selection.dto';

export class QuoteDto {
  @IsString()
  listingId!: string;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @IsInt()
  @Min(1)
  guests!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnSelectionDto)
  addOns?: AddOnSelectionDto[];

  /** When passed, the guest's membership tier is applied as a platform-fee discount. */
  @IsOptional()
  @IsString()
  userId?: string;
}

/** Snapshot line per selected add-on — frozen at quote time, protected by the HMAC. */
export interface PriceSnapshotAddOn {
  addOnId: string;
  providerId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  commission: number;
  providerShare: number;
  cancellationTier: string;
}

export interface PriceSnapshot {
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  baseNightlyRate: number;
  nightlyBreakdown: { date: string; rate: number }[];
  subtotal: number;
  cleaningFee: number;
  platformFeeRate: number;
  /** Platform fee after loyalty discount has been applied. */
  platformFee: number;
  /** Loyalty discount in paise that was deducted from the gross platform fee (0 for guests without membership). */
  loyaltyDiscount?: number;
  /** Member tier used to compute the discount, if any. */
  loyaltyTier?: string;
  /** Sum of all addOns[].totalPrice */
  addOnsTotal: number;
  addOns: PriceSnapshotAddOn[];
  total: number;
  depositAmount: number;
  balanceAmount: number;
  /**
   * First-instalment options per Pay Later term, in paise. Keyed by months
   * (3/6/12). Computed at quote time and frozen under the HMAC so the client
   * cannot pay a different amount than what the quote showed.
   */
  payLaterFirstInstalment?: { months: number; amountMinor: number }[];
  currency: string;
  snapshotAt: string;
  /** HMAC-SHA256 signature over financial fields — set by PricingService */
  hmac?: string;
}
