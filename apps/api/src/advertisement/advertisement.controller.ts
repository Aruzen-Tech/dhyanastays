import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { AdvertisementService } from './advertisement.service';

/**
 * Public promotions surface (the Advertisement Centre's front-end feed).
 * Deliberately mounted at `/promotions` with neutral action names (`view`,
 * `go`) rather than `/advertisements/.../impression|click`, because ad-blocker
 * filter lists block those words and would hide these first-party promos.
 * Gated by the `advertisements` feature flag (master kill-switch).
 */
@FeatureGate('advertisements')
@Controller('promotions')
export class AdvertisementController {
  constructor(private readonly ads: AdvertisementService) {}

  @Public()
  @Get('active')
  getActive(@Query('placement') placement?: string) {
    return this.ads.getActive(placement || 'explore_billboard');
  }

  @Public()
  @Post(':id/view')
  @HttpCode(200)
  view(@Param('id') id: string) {
    return this.ads.recordImpression(id);
  }

  @Public()
  @Post(':id/go')
  @HttpCode(200)
  go(@Param('id') id: string) {
    return this.ads.recordClick(id);
  }
}
