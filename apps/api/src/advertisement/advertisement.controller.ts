import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { AdvertisementService } from './advertisement.service';

/**
 * Public Advertisement Centre surface. Gated by the `advertisements` feature
 * flag — flipping it off in the control panel is the master kill-switch for
 * every placement without touching individual ads.
 */
@FeatureGate('advertisements')
@Controller('advertisements')
export class AdvertisementController {
  constructor(private readonly ads: AdvertisementService) {}

  @Public()
  @Get('active')
  getActive(@Query('placement') placement?: string) {
    return this.ads.getActive(placement || 'explore_billboard');
  }

  @Public()
  @Post(':id/impression')
  @HttpCode(200)
  impression(@Param('id') id: string) {
    return this.ads.recordImpression(id);
  }

  @Public()
  @Post(':id/click')
  @HttpCode(200)
  click(@Param('id') id: string) {
    return this.ads.recordClick(id);
  }
}
