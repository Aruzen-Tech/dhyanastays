import { PrismaService } from '../prisma/prisma.service';
import { PriceSnapshot, QuoteDto } from './dto/quote.dto';
export declare const PLATFORM_FEE_RATE = 0.1;
export declare class PricingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    quote(dto: QuoteDto): Promise<PriceSnapshot>;
    computeRefundAmount(totalPaid: number, checkIn: Date, cancelledAt?: Date): number;
    private diffDays;
}
