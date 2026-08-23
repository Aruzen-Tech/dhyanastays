import { IsOptional, IsString } from 'class-validator';

/**
 * Admin/system-only. There is no live hook into the booking-creation flow
 * yet (that would require modifying the booking module, out of scope for
 * this pass) — this endpoint is the documented integration point a future
 * booking-service hook can call once a promo code / tracking link is
 * captured at checkout. See InfluencerService.attributeBooking().
 */
export class AttributeBookingDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsString()
  trackingLinkSlug?: string;
}
