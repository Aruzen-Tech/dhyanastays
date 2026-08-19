import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { SpotlightService } from './spotlight.service';

/** Public homepage feed for the Stay Spotlight carousel. */
@Controller('spotlight')
export class SpotlightController {
  constructor(private readonly spotlight: SpotlightService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  getFeed() {
    return this.spotlight.getPublicFeed();
  }
}
