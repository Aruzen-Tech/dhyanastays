import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { QuoteDto } from './dto/quote.dto';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Post('quote')
  quote(@Body() dto: QuoteDto) {
    return this.pricingService.quote(dto);
  }
}
