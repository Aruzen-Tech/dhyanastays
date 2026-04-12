import { QuoteDto } from './dto/quote.dto';
import { PricingService } from './pricing.service';
export declare class PricingController {
    private readonly pricingService;
    constructor(pricingService: PricingService);
    quote(dto: QuoteDto): Promise<import("./dto/quote.dto").PriceSnapshot>;
}
