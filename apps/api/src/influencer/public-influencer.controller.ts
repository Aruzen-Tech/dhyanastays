import { Controller, Get, Headers, Ip, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createHash } from 'crypto';
import { Public } from '../common/decorators/public.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { InfluencerService } from './influencer.service';

/**
 * Public redirect endpoint a tracking link's short URL points at (e.g.
 * dhyanastays.com/go/abc123xy) — records the click, then 302s the visitor
 * onward. No auth: this is hit directly by anonymous visitors from social
 * platforms, matching docx §5 (Influencer → Instagram → Link → Dhyana Stays).
 */
@FeatureGate('influencer_dashboard')
@Controller('go')
export class PublicInfluencerController {
  constructor(private readonly service: InfluencerService) {}

  @Public()
  @Get(':slug')
  async redirect(
    @Param('slug') slug: string,
    @Res() res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    // Hashed, not stored raw — enough to de-duplicate/rate-limit later
    // without retaining a visitor's raw IP address.
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : undefined;
    const destination = await this.service.recordClickAndResolve(slug, { ipHash, userAgent });
    res.redirect(302, destination);
  }
}
