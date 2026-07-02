import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldService } from './hold.service';
export declare class HoldController {
    private readonly holdService;
    constructor(holdService: HoldService);
    create(user: RequestUser, dto: CreateHoldDto): Promise<{
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        expiresAt: Date;
        listingId: string;
        guestId: string;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
